import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEquipment } from "@/db/operations/equipment.server";
import {
	queryEventImage,
	submitEventImage,
} from "@/db/operations/event-images.server";
import { createEvent, resolveEvent } from "@/db/operations/events.server";
import { queryGeneratedImages } from "@/db/operations/generated-images.server";
import {
	enqueueImageGeneration,
	retryImageGeneration,
} from "@/db/operations/image-generation.server";
import {
	buildMatchImagePrompt,
	queryMatchImage,
	submitCompletedMatchImage,
} from "@/db/operations/match-images.server";
import { updateMatch } from "@/db/operations/matches.server";
import { listQueueJobs } from "@/db/operations/queue-jobs.server";
import { createWarband } from "@/db/operations/warbands.server";
import { createWarriorEquipment } from "@/db/operations/warrior-equipment.server";
import {
	queryWarriorPortrait,
	submitWarriorPortrait,
} from "@/db/operations/warrior-portraits.server";
import { createWarrior, deleteWarrior } from "@/db/operations/warriors.server";
import { imageGenerationJobs } from "@/db/schema";
import {
	GEMINI_IMAGE_MODEL,
	OPENAI_IMAGE_MODEL,
} from "@/db/validation/image-generation";
import { affectsMatchOutcome } from "@/db/validation/match";
import {
	assignment,
	clock,
	equipment,
	event,
	seedMatch,
	updatedAt,
	warband,
	warrior,
} from "./fixtures";
import { createTestDatabase } from "./test-database";

let connection: Awaited<ReturnType<typeof createTestDatabase>>;
beforeEach(async () => {
	connection = await createTestDatabase();
}, 30_000);
afterEach(async () => {
	await connection?.dispose();
});

describe("image job operations on local D1", () => {
	it("persists jobs before queue delivery and timestamps the queued transition", async () => {
		const { db } = connection;
		const send = vi.fn(async ({ jobId }: { jobId: string }) => {
			expect(await listQueueJobs(db)).toContainEqual(
				expect.objectContaining({
					id: jobId,
					status: "pending",
					prompt: "A ruined city",
					model: GEMINI_IMAGE_MODEL,
				}),
			);
			return { metadata: { metrics: { backlogCount: 1, backlogBytes: 0 } } };
		});
		const job = await enqueueImageGeneration(
			db,
			{ send },
			{ prompt: "A ruined city", model: GEMINI_IMAGE_MODEL },
			clock,
		);
		expect(send).toHaveBeenCalledExactlyOnceWith({ jobId: job.jobId });
		expect(await listQueueJobs(db)).toContainEqual(
			expect.objectContaining({ id: job.jobId, status: "queued", updatedAt }),
		);
		expect(await queryGeneratedImages(db)).toEqual([]);
		await db
			.update(imageGenerationJobs)
			.set({ status: "completed", completedAt: updatedAt })
			.where(eq(imageGenerationJobs.id, job.jobId));
		expect(await queryGeneratedImages(db)).toEqual([
			{ id: job.jobId, prompt: "A ruined city", completedAt: updatedAt },
		]);
	});

	it("timestamps queue failure but never overwrites an advanced consumer state", async () => {
		const { db } = connection;
		const failed = await enqueueImageGeneration(
			db,
			{ send: vi.fn().mockRejectedValue(new Error("private details")) },
			{ prompt: "Prompt", model: GEMINI_IMAGE_MODEL },
			clock,
		);
		expect(await listQueueJobs(db)).toContainEqual(
			expect.objectContaining({
				id: failed.jobId,
				status: "enqueue_failed",
				updatedAt,
				error: "Queue submission failed; delivery may be uncertain.",
			}),
		);
		const raced = await enqueueImageGeneration(
			db,
			{
				send: async ({ jobId }) => {
					await db
						.update(imageGenerationJobs)
						.set({ status: "processing", updatedAt: "consumer time" })
						.where(eq(imageGenerationJobs.id, jobId));
					return {
						metadata: { metrics: { backlogCount: 1, backlogBytes: 0 } },
					};
				},
			},
			{ prompt: "Another", model: GEMINI_IMAGE_MODEL },
			clock,
		);
		expect(await listQueueJobs(db)).toContainEqual(
			expect.objectContaining({
				id: raced.jobId,
				status: "processing",
				updatedAt: "consumer time",
			}),
		);
	});

	it("submits one portrait per warrior and preserves jobs after warrior deletion", async () => {
		const { db } = connection;
		await createWarband(db, warband());
		await createWarrior(db, warrior());
		const queue = { send: vi.fn().mockResolvedValue(undefined) };
		const result = await submitWarriorPortrait(db, queue, "wa", clock);
		expect(result).toHaveProperty("job.status", "queued");
		expect(await queryWarriorPortrait(db, "wa")).toEqual(
			expect.objectContaining({ status: "queued" }),
		);
		await submitWarriorPortrait(db, queue, "wa", clock);
		expect(queue.send).toHaveBeenCalledTimes(1);
		expect(await listQueueJobs(db)).toHaveLength(1);
		expect(await listQueueJobs(db)).toContainEqual(
			expect.objectContaining({
				warriorId: "wa",
				model: OPENAI_IMAGE_MODEL,
				updatedAt,
			}),
		);
		await deleteWarrior(db, { id: "wa" });
		expect(await queryWarriorPortrait(db, "wa")).toBeUndefined();
		expect(await listQueueJobs(db)).toContainEqual(
			expect.objectContaining({ warriorId: null }),
		);
		await expect(
			submitWarriorPortrait(db, queue, "missing", clock),
		).resolves.toHaveProperty("error");
	});

	it("queues one contextual illustration for a resolved injury event", async () => {
		const { db } = connection;
		await seedMatch(db);
		await createEquipment(db, equipment("rusty-sword"));
		await createWarriorEquipment(
			db,
			assignment("attacker-sword", "wa", "rusty-sword"),
		);
		await createEvent(db, {
			...event(),
			notes: "The marksman lunged across a broken chapel stair.",
		});
		await resolveEvent(db, { id: "event", outcome: "Injury" }, clock);
		const queue = { send: vi.fn().mockResolvedValue(undefined) };

		const first = await submitEventImage(db, queue, "event", clock);
		const second = await submitEventImage(db, queue, "event", clock);

		expect(first).toHaveProperty("job.status", "queued");
		expect(second).toHaveProperty("job.jobId", first.job?.jobId);
		expect(second).toHaveProperty("job.status", "queued");
		expect(queue.send).toHaveBeenCalledTimes(1);
		expect(await queryEventImage(db, "event")).toEqual(
			expect.objectContaining({ status: "queued" }),
		);
		expect(await listQueueJobs(db)).toContainEqual(
			expect.objectContaining({
				eventId: "event",
				model: OPENAI_IMAGE_MODEL,
				prompt: expect.stringMatching(
					/The marksman lunged.*Attacking warrior: wa.*rusty-sword.*Defending warrior: wb/s,
				),
			}),
		);
	});

	it("queues one final-state image for a completed victory", async () => {
		const { db } = connection;
		await seedMatch(db);
		await createEvent(db, {
			...event(),
			notes: "wa drove wb from the shattered market square.",
		});
		await resolveEvent(db, { id: "event", outcome: "Injury" }, clock);
		await updateMatch(
			db,
			{
				id: "match",
				changes: {
					status: "Completed",
					result: "Victory",
					winnerWarbandId: "a",
				},
			},
			clock,
		);
		const queue = { send: vi.fn().mockResolvedValue(undefined) };

		const first = await submitCompletedMatchImage(db, queue, "match", clock);
		const second = await submitCompletedMatchImage(db, queue, "match", clock);

		expect(first).toHaveProperty("job.status", "queued");
		expect(second).toHaveProperty("job.jobId", first.job?.jobId);
		expect(queue.send).toHaveBeenCalledTimes(1);
		expect(await queryMatchImage(db, "match")).toEqual(
			expect.objectContaining({ status: "queued" }),
		);
		expect(await listQueueJobs(db)).toContainEqual(
			expect.objectContaining({
				matchId: "match",
				warriorId: null,
				eventId: null,
				model: OPENAI_IMAGE_MODEL,
				prompt: expect.stringMatching(
					/a is the victorious winner.*b is defeated.*"warbands".*"name": "a".*"name": "b".*wa drove wb.*"attacker".*"name": "wa".*"defender".*"name": "wb"/s,
				),
			}),
		);
	});

	it("does not queue match images without a completed victory and winner", async () => {
		const { db } = connection;
		await seedMatch(db);
		const queue = { send: vi.fn().mockResolvedValue(undefined) };

		expect(await submitCompletedMatchImage(db, queue, "match", clock)).toEqual({
			job: null,
		});
		await updateMatch(
			db,
			{ id: "match", changes: { status: "Completed", result: "Draw" } },
			clock,
		);
		expect(await submitCompletedMatchImage(db, queue, "match", clock)).toEqual({
			job: null,
		});
		await updateMatch(
			db,
			{
				id: "match",
				changes: {
					status: "InProgress",
					result: "Victory",
					winnerWarbandId: "a",
				},
			},
			clock,
		);
		expect(await submitCompletedMatchImage(db, queue, "match", clock)).toEqual({
			job: null,
		});
		expect(queue.send).not.toHaveBeenCalled();
	});

	it("submits the match image when the winner arrives after the status", async () => {
		// The completion dialog saves the winner in a second update that carries no
		// status change, so submission must follow the stored match, not the delta.
		const { db } = connection;
		await seedMatch(db);
		const queue = { send: vi.fn().mockResolvedValue(undefined) };

		const statusChange = { status: "Completed" } as const;
		await updateMatch(db, { id: "match", changes: statusChange }, clock);
		expect(affectsMatchOutcome(statusChange)).toBe(true);
		expect(await submitCompletedMatchImage(db, queue, "match", clock)).toEqual({
			job: null,
		});

		const resultChange = {
			result: "Victory",
			winnerWarbandId: "a",
		} as const;
		expect(affectsMatchOutcome(resultChange)).toBe(true);
		await updateMatch(db, { id: "match", changes: resultChange }, clock);

		expect(
			await submitCompletedMatchImage(db, queue, "match", clock),
		).toHaveProperty("job.status", "queued");
		expect(queue.send).toHaveBeenCalledTimes(1);
		expect(await queryMatchImage(db, "match")).toEqual(
			expect.objectContaining({ status: "queued" }),
		);
	});

	it("ignores match updates that cannot change the outcome", () => {
		expect(affectsMatchOutcome({})).toBe(false);
		expect(affectsMatchOutcome({ name: "Renamed", scenario: "Skirmish" })).toBe(
			false,
		);
		expect(affectsMatchOutcome({ winnerWarbandId: null })).toBe(true);
	});

	it("re-delivers stranded jobs instead of reporting them as submitted", async () => {
		const { db } = connection;
		await seedMatch(db);
		await createEvent(db, { ...event(), notes: "wa felled wb." });
		await resolveEvent(db, { id: "event", outcome: "Injury" }, clock);
		await updateMatch(
			db,
			{
				id: "match",
				changes: {
					status: "Completed",
					result: "Victory",
					winnerWarbandId: "a",
				},
			},
			clock,
		);
		const failing = { send: vi.fn().mockRejectedValue(new Error("no queue")) };
		const working = { send: vi.fn().mockResolvedValue(undefined) };

		const strandedEvent = await submitEventImage(db, failing, "event", clock);
		const strandedMatch = await submitCompletedMatchImage(
			db,
			failing,
			"match",
			clock,
		);
		expect(strandedEvent).toHaveProperty("job.status", "enqueue_failed");
		expect(strandedMatch).toHaveProperty("job.status", "enqueue_failed");

		expect(await submitEventImage(db, working, "event", clock)).toEqual({
			job: { jobId: strandedEvent.job?.jobId, status: "queued" },
		});
		expect(
			await submitCompletedMatchImage(db, working, "match", clock),
		).toEqual({ job: { jobId: strandedMatch.job?.jobId, status: "queued" } });

		// Retried in place: no duplicate rows, and the prompts are the stored ones.
		expect(working.send).toHaveBeenCalledTimes(2);
		expect(await listQueueJobs(db)).toHaveLength(2);
		expect(await queryEventImage(db, "event")).toEqual({
			jobId: strandedEvent.job?.jobId,
			status: "queued",
			error: null,
		});
		expect(await queryMatchImage(db, "match")).toEqual({
			jobId: strandedMatch.job?.jobId,
			status: "queued",
			error: null,
		});
	});

	it("never re-delivers a job the consumer already owns", async () => {
		const { db } = connection;
		const queue = { send: vi.fn().mockResolvedValue(undefined) };
		const { jobId } = await enqueueImageGeneration(
			db,
			queue,
			{ prompt: "A ruined city", model: GEMINI_IMAGE_MODEL },
			clock,
		);
		await db
			.update(imageGenerationJobs)
			.set({ status: "processing" })
			.where(eq(imageGenerationJobs.id, jobId));

		await retryImageGeneration(db, queue, jobId, clock);

		expect(await listQueueJobs(db)).toContainEqual(
			expect.objectContaining({ id: jobId, status: "processing" }),
		);
	});

	it("deterministically keeps final-match prompts within provider limits", () => {
		const prompt = buildMatchImagePrompt({
			match: { name: "Final", scenario: "Skirmish" },
			winnerWarbandId: "a",
			warbands: [warband("a"), warband("b")],
			warriors: [warrior("wa", "a"), warrior("wb", "b")],
			events: Array.from({ length: 30 }, (_, index) => ({
				...event(`event-${String(index).padStart(2, "0")}`),
				createdAt: `2026-09-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
				notes: `${index}-${"x".repeat(1000)}`,
				outcome: "Injury",
				voidedAt: null,
			})),
		});

		expect(prompt.length).toBeLessThanOrEqual(4000);
		expect(prompt).toContain("event-29");
		expect(prompt).not.toContain("event-00");
		expect(prompt).toMatch(/"omittedOlder": [1-9]/);
	});

	it("bounds opaque identifiers in final-match prompts", () => {
		const winnerId = "winner-".repeat(400);
		const loserId = "loser-".repeat(400);

		const prompt = buildMatchImagePrompt({
			match: { name: "Final", scenario: "Skirmish" },
			winnerWarbandId: winnerId,
			warbands: [warband(winnerId), warband(loserId)],
			warriors: [],
			events: [],
		});

		expect(prompt.length).toBeLessThanOrEqual(4000);
		expect(prompt).not.toContain(winnerId);
		expect(prompt).not.toContain(loserId);
	});

	it("does not queue event images for unresolved or recovery events", async () => {
		const { db } = connection;
		await seedMatch(db);
		await createEvent(db, event());
		const queue = { send: vi.fn().mockResolvedValue(undefined) };
		expect(await submitEventImage(db, queue, "event", clock)).toEqual({
			job: null,
		});
		await resolveEvent(db, { id: "event", outcome: "Recovery" }, clock);
		expect(await submitEventImage(db, queue, "event", clock)).toEqual({
			job: null,
		});
		expect(queue.send).not.toHaveBeenCalled();
	});

	it("bounds and orders diagnostic and completed-image listings", async () => {
		const { db } = connection;
		for (let i = 0; i < 102; i++) {
			await db.insert(imageGenerationJobs).values({
				id: String(i).padStart(3, "0"),
				prompt: "Prompt",
				status: "completed",
				createdAt: updatedAt,
				completedAt: updatedAt,
			});
		}
		const expectedIds = Array.from({ length: 100 }, (_, i) =>
			String(101 - i).padStart(3, "0"),
		);
		expect((await listQueueJobs(db)).map((row) => row.id)).toEqual(expectedIds);
		expect((await queryGeneratedImages(db)).map((row) => row.id)).toEqual(
			expectedIds,
		);
	});
});
