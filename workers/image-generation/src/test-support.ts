import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/d1";
import { createJobStore } from "./jobs";

export const jobId = "d5da15a1-f26a-4f14-a350-3ba77d6ea6ad";
export const jpegBase64 =
	"/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJUAB//Z";
export const jpegBytes = Uint8Array.from(atob(jpegBase64), (character) =>
	character.charCodeAt(0),
);

export function setupDatabase(now?: () => number) {
	const sqlite = new DatabaseSync(":memory:");
	sqlite.exec("PRAGMA foreign_keys = ON");
	for (const migration of [
		"0000_rich_blackheart.sql",
		"0001_optimal_chat.sql",
		"0002_flowery_mariko_yashida.sql",
		"0003_sticky_prowler.sql",
		"0004_charming_gressill.sql",
		"0005_lovely_pestilence.sql",
		"0006_left_krista_starr.sql",
		"0007_certain_steve_rogers.sql",
		"0008_greedy_cassandra_nova.sql",
		"0009_stormy_overlord.sql",
		"0010_windy_karma.sql",
		"0011_image_generation_jobs.sql",
		"0012_tense_echo.sql",
		"0013_last_charles_xavier.sql",
		"0014_cool_callisto.sql",
		"0015_equipment_source_catalogue.sql",
		"0016_slimy_mathemanic.sql",
		"0017_glorious_the_hunter.sql",
	]) {
		sqlite.exec(
			readFileSync(
				new URL(`../../../drizzle/${migration}`, import.meta.url),
				"utf8",
			),
		);
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
