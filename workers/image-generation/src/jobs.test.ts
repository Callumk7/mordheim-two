import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/d1";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/db/index.server";
import { enqueueImageGeneration } from "@/server/image-generation";
import { recordJobConsumption } from "./jobs";

vi.mock("cloudflare:workers", () => ({ env: {} }));

const connections: DatabaseSync[] = [];
afterEach(() => {
	vi.useRealTimers();
	for (const connection of connections) connection.close();
	connections.length = 0;
});

function setup() {
	const sqlite = new DatabaseSync(":memory:");
	connections.push(sqlite);
	sqlite.exec(`CREATE TABLE image_generation_jobs (
		id TEXT PRIMARY KEY, prompt TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
		error TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`);
	// Execute Drizzle's generated D1 SQL against real SQLite, without Cloudflare.
	const binding = {
		prepare(query: string) {
			return {
				bind(...params: (string | number | null)[]) {
					return {
						async run() {
							return sqlite.prepare(query).run(...params);
						},
						async raw() {
							const statement = sqlite.prepare(query);
							statement.setReturnArrays(true);
							return statement.all(...params);
						},
					};
				},
			};
		},
	} as unknown as D1Database;
	return { sqlite, db: drizzle(binding) };
}

describe("durable queue receipt", () => {
	it.each([
		"pending",
		"queued",
		"enqueue_failed",
	])("records receipt from %s and preserves it on duplicate delivery", async (status) => {
		const { db, sqlite } = setup();
		sqlite
			.prepare(
				"INSERT INTO image_generation_jobs (id, prompt, status, error) VALUES (?, ?, ?, ?)",
			)
			.run("job", "portrait", status, "old error");
		expect(await recordJobConsumption(db, "job")).toEqual({ id: "job" });
		const first = sqlite.prepare("SELECT * FROM image_generation_jobs").get();
		expect(first).toMatchObject({ status: "consumed", error: null });
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2099-01-01T00:00:00Z"));
		await recordJobConsumption(db, "job");
		expect(sqlite.prepare("SELECT * FROM image_generation_jobs").get()).toEqual(
			first,
		);
	});

	it("does not acknowledge a missing record as a successful write", async () => {
		const { db } = setup();
		expect(await recordJobConsumption(db, "missing")).toBeUndefined();
	});

	it.each([
		false,
		true,
	])("a late producer update cannot overwrite consumption (send throws: %s)", async (sendThrows) => {
		const { db, sqlite } = setup();
		await enqueueImageGeneration(
			db as unknown as Database,
			{
				send: async ({ jobId }) => {
					await recordJobConsumption(db, jobId);
					if (sendThrows) throw new Error("Uncertain delivery");
					return {
						metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } },
					};
				},
			},
			"portrait",
		);
		expect(
			sqlite.prepare("SELECT status, error FROM image_generation_jobs").get(),
		).toMatchObject({ status: "consumed", error: null });
	});
});
