import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/d1";
import { createJobStore } from "./persistence/job-store";

export const jobId = "d5da15a1-f26a-4f14-a350-3ba77d6ea6ad";
export const jpegBase64 =
	"/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJUAB//Z";
export const jpegBytes = Uint8Array.from(atob(jpegBase64), (character) =>
	character.charCodeAt(0),
);

export function setupDatabase(now?: () => number) {
	const sqlite = new DatabaseSync(":memory:");
	sqlite.exec("PRAGMA foreign_keys = ON");
	const drizzleDirectory = new URL("../../../drizzle/", import.meta.url);
	for (const migration of readdirSync(drizzleDirectory)
		.filter((name) => name.endsWith(".sql"))
		.sort()) {
		sqlite.exec(readFileSync(new URL(migration, drizzleDirectory), "utf8"));
	}
	// Test-only D1 adapter: execute actual Drizzle SQL and migrations in SQLite.
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
	const db = drizzle(binding);
	return {
		sqlite,
		db,
		jobs: createJobStore(db, now),
		insert(status = "queued") {
			sqlite
				.prepare(
					"INSERT INTO image_generation_jobs (id, prompt, status) VALUES (?, ?, ?)",
				)
				.run(jobId, "private portrait prompt", status);
		},
	};
}
