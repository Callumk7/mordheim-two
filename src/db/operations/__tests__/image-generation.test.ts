import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEquipment } from "@/db/operations/equipment.server";
import {
	queryEventImage,
	submitEventImage,
} from "@/db/operations/event-images.server";
import { createEvent, resolveEvent } from "@/db/operations/events.server";
import { queryGeneratedImages } from "@/db/operations/generated-images.server";
import { enqueueImageGeneration } from "@/db/operations/image-generation.server";
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
				}),
			);
			return { metadata: { metrics: { backlogCount: 1, backlogBytes: 0 } } };
		});
		const job = await enqueueImageGeneration(
			db,
			{ send },
			"A ruined city",
			undefined,
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
			"Prompt",
			undefined,
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
			"Another",
			undefined,
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
			expect.objectContaining({ warriorId: "wa", updatedAt }),
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
				prompt: expect.stringMatching(
					/The marksman lunged.*Attacking warrior: wa.*rusty-sword.*Defending warrior: wb/s,
				),
			}),
		);
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
