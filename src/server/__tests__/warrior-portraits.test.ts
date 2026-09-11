import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import { enqueueImageGeneration } from "@/db/operations/image-generation.server";
import {
	buildWarriorPortraitPrompt,
	queryWarriorPortrait,
	submitWarriorPortrait,
} from "@/db/operations/warrior-portraits.server";
import { WarriorPortraitInputSchema } from "@/db/validation/warrior-portrait";
import { setupDatabase } from "../../../workers/image-generation/src/test-support";

const connections: ReturnType<typeof setupDatabase>[] = [];
function setup() {
	const connection = setupDatabase();
	connections.push(connection);
	connection.sqlite.exec(`
		INSERT INTO warbands (id, name, faction, bio) VALUES ('band', 'The Crows', 'Reikland', 'Veteran treasure hunters');
		INSERT INTO warriors (id, name, class, description, warband_id) VALUES
		('warrior', 'Klaus', 'Marksman', 'Scarred face, green hood', 'band'),
		('other', 'Hans', 'Swordsman', NULL, 'band');
	`);
	return {
		...connection,
		db: connection.db,
		send: vi.fn().mockResolvedValue(undefined),
	};
}
afterEach(() => {
	for (const { sqlite } of connections.splice(0)) sqlite.close();
});
const context = {
	name: "Klaus",
	class: "Marksman",
	description: "Scarred face",
	warbandName: "The Crows",
	faction: "Reikland",
	warbandBio: "Veteran treasure hunters",
};

describe("warrior portrait prompts", () => {
	it("accepts non-UUID warrior IDs but rejects empty IDs and supplied prompts", () => {
		expect(
			WarriorPortraitInputSchema.parse({ warriorId: "warrior" }).warriorId,
		).toBe("warrior");
		expect(
			WarriorPortraitInputSchema.safeParse({ warriorId: " " }).success,
		).toBe(false);
		expect(
			WarriorPortraitInputSchema.safeParse({
				warriorId: "warrior",
				prompt: "override",
			}).success,
		).toBe(false);
	});
	it("includes labeled Mordheim context and leaves the shared style suffix to the adapter", () => {
		const { prompt } = buildWarriorPortraitPrompt(context);
		for (const value of Object.values(context)) expect(prompt).toContain(value);
		expect(prompt).toContain("Mordheim");
		expect(prompt).toContain("head-and-shoulders");
		expect(prompt).not.toContain("John Blanche");
		expect(prompt).not.toContain("rating");
	});
	it.each([null, "", "  "])("handles missing description %s", (description) => {
		expect(
			buildWarriorPortraitPrompt({ ...context, description }).prompt,
		).toContain("Warrior description: Unspecified");
	});
	it("rejects oversized context without truncating it", () => {
		expect(
			buildWarriorPortraitPrompt({ ...context, description: "x".repeat(4000) })
				.error,
		).toContain("Shorten");
	});
});

describe("warrior portrait persistence", () => {
	it("preserves historical jobs when applying the additive migration", () => {
		const sqlite = new DatabaseSync(":memory:");
		try {
			const apply = (name: string) =>
				sqlite.exec(
					readFileSync(
						new URL(`../../../drizzle/${name}`, import.meta.url),
						"utf8",
					),
				);
			sqlite.exec("PRAGMA foreign_keys = ON");
			apply("0000_rich_blackheart.sql");
			apply("0005_lovely_pestilence.sql");
			apply("0011_image_generation_jobs.sql");
			apply("0012_tense_echo.sql");
			sqlite.exec(
				"INSERT INTO image_generation_jobs (id, prompt, status) VALUES ('old', 'Original prompt', 'completed')",
			);
			apply("0016_slimy_mathemanic.sql");
			expect(
				sqlite
					.prepare(
						"SELECT id, prompt, status, warrior_id FROM image_generation_jobs",
					)
					.get(),
			).toMatchObject({
				id: "old",
				prompt: "Original prompt",
				status: "completed",
				warrior_id: null,
			});
			expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
		} finally {
			sqlite.close();
		}
	});
	it("persists the association and snapshot before sending only the job ID", async () => {
		const { db, sqlite, send } = setup();
		send.mockImplementation(async ({ jobId }) => {
			const row = sqlite
				.prepare("SELECT * FROM image_generation_jobs WHERE id = ?")
				.get(jobId);
			expect(row).toMatchObject({ warrior_id: "warrior", status: "pending" });
			expect(row?.prompt).toContain("Scarred face, green hood");
		});
		const result = await submitWarriorPortrait(db, { send }, "warrior");
		expect(send).toHaveBeenCalledExactlyOnceWith({ jobId: result.job?.jobId });
		sqlite.exec(
			"UPDATE warriors SET description = 'Changed' WHERE id = 'warrior'; UPDATE warbands SET name = 'Changed'",
		);
		await submitWarriorPortrait(db, { send }, "warrior");
		expect(send).toHaveBeenCalledOnce();
		expect(
			sqlite.prepare("SELECT prompt FROM image_generation_jobs").get()?.prompt,
		).toContain("The Crows");
	});
	it("deduplicates concurrent submissions with the unique database constraint", async () => {
		const { db, sqlite, send } = setup();
		const results = await Promise.all(
			Array.from({ length: 5 }, () =>
				submitWarriorPortrait(db, { send }, "warrior"),
			),
		);
		expect(new Set(results.map((result) => result.job?.jobId)).size).toBe(1);
		expect(send).toHaveBeenCalledOnce();
		expect(
			sqlite
				.prepare("SELECT count(*) AS count FROM image_generation_jobs")
				.get()?.count,
		).toBe(1);
	});
	it("rejects missing warriors and oversized saved prompts without sending or inserting", async () => {
		const { db, sqlite, send } = setup();
		expect(
			(await submitWarriorPortrait(db, { send }, "missing")).error,
		).toContain("no longer exists");
		sqlite.prepare("UPDATE warriors SET description = ?").run("x".repeat(4000));
		expect(
			(await submitWarriorPortrait(db, { send }, "warrior")).error,
		).toContain("Shorten");
		expect(send).not.toHaveBeenCalled();
		expect(
			sqlite
				.prepare("SELECT count(*) AS count FROM image_generation_jobs")
				.get()?.count,
		).toBe(0);
	});
	it.each([
		"warriors",
		"warbands",
	])("detaches jobs when deleting %s", async (table) => {
		const { db, sqlite, send } = setup();
		await submitWarriorPortrait(db, { send }, "warrior");
		sqlite.exec(`DELETE FROM ${table}`);
		expect(
			sqlite.prepare("SELECT warrior_id FROM image_generation_jobs").get()
				?.warrior_id,
		).toBeNull();
		expect(await queryWarriorPortrait(db, "warrior")).toBeUndefined();
	});
	it("allows multiple generic jobs and scopes reads by warrior, not gallery limits", async () => {
		const { db, sqlite, send } = setup();
		const result = await submitWarriorPortrait(db, { send }, "warrior");
		await enqueueImageGeneration(db, { send }, "Generic one");
		await enqueueImageGeneration(db, { send }, "Generic two");
		const insert = sqlite.prepare(
			"INSERT INTO image_generation_jobs (id, prompt, status) VALUES (?, 'Generic', 'completed')",
		);
		for (let i = 0; i < 101; i++) insert.run(`generic-${i}`);
		expect((await queryWarriorPortrait(db, "warrior"))?.jobId).toBe(
			result.job?.jobId,
		);
		expect(await queryWarriorPortrait(db, "other")).toBeUndefined();
		for (const status of [
			"pending",
			"queued",
			"processing",
			"completed",
			"failed",
			"enqueue_failed",
			"consumed",
		]) {
			sqlite
				.prepare(
					"UPDATE image_generation_jobs SET status = ?, error = 'Sanitized error' WHERE warrior_id = 'warrior'",
				)
				.run(status);
			expect(await queryWarriorPortrait(db, "warrior")).toMatchObject({
				status,
				error: "Sanitized error",
			});
		}
	});
	it("records uncertain queue failure and never resends an existing job", async () => {
		const { db, send } = setup();
		send.mockRejectedValue(new Error("Private queue details"));
		const result = await submitWarriorPortrait(db, { send }, "warrior");
		expect(result.job?.status).toBe("enqueue_failed");
		expect((await queryWarriorPortrait(db, "warrior"))?.error).not.toContain(
			"Private",
		);
		await submitWarriorPortrait(db, { send }, "warrior");
		expect(send).toHaveBeenCalledOnce();
	});
	it("does not overwrite a consumer completion that races the producer", async () => {
		const { db, sqlite, send } = setup();
		send.mockImplementation(async ({ jobId }) => {
			sqlite
				.prepare(
					"UPDATE image_generation_jobs SET status = 'completed' WHERE id = ?",
				)
				.run(jobId);
		});
		await submitWarriorPortrait(db, { send }, "warrior");
		expect(await queryWarriorPortrait(db, "warrior")).toMatchObject({
			status: "completed",
		});
	});
	it("keeps the association after a post-send D1 failure without mislabeling delivery", async () => {
		const { db, sqlite, send } = setup();
		send.mockImplementation(async () => {
			sqlite.exec(
				"CREATE TRIGGER reject_update BEFORE UPDATE ON image_generation_jobs BEGIN SELECT RAISE(ABORT, 'D1 unavailable'); END",
			);
		});
		await expect(
			submitWarriorPortrait(db, { send }, "warrior"),
		).rejects.toThrow();
		expect(await queryWarriorPortrait(db, "warrior")).toMatchObject({
			status: "pending",
			error: null,
		});
		await submitWarriorPortrait(db, { send }, "warrior");
		expect(send).toHaveBeenCalledOnce();
	});
	it("propagates unrelated D1 failures rather than treating them as duplicate submissions", async () => {
		const { db, sqlite, send } = setup();
		sqlite.exec(
			"CREATE TRIGGER reject_job BEFORE INSERT ON image_generation_jobs BEGIN SELECT RAISE(ABORT, 'unrelated failure'); END",
		);
		await expect(
			submitWarriorPortrait(db, { send }, "warrior"),
		).rejects.toThrow();
		expect(send).not.toHaveBeenCalled();
	});
});
