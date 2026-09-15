import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
	new URL("../../../drizzle/0024_wandering_cerise.sql", import.meta.url),
	"utf8",
);

function applyMigration(db: DatabaseSync) {
	for (const statement of migration.split("--> statement-breakpoint")) {
		db.exec(statement);
	}
}

describe("0024 archive migration", () => {
	it("preserves existing rows as active and enforces archive pairs", () => {
		const db = new DatabaseSync(":memory:");
		try {
			db.exec(`
				PRAGMA foreign_keys = ON;
				CREATE TABLE warbands (
					id TEXT PRIMARY KEY NOT NULL,
					name TEXT NOT NULL,
					faction TEXT NOT NULL,
					bio TEXT,
					gold INTEGER DEFAULT 0 NOT NULL,
					rating INTEGER DEFAULT 0 NOT NULL,
					wins INTEGER DEFAULT 0 NOT NULL,
					created_at TEXT NOT NULL,
					updated_at TEXT NOT NULL
				);
				CREATE TABLE warriors (
					id TEXT PRIMARY KEY NOT NULL,
					name TEXT NOT NULL,
					class TEXT NOT NULL,
					description TEXT,
					status TEXT DEFAULT 'Alive' NOT NULL,
					warband_id TEXT NOT NULL REFERENCES warbands(id) ON DELETE CASCADE,
					knocked INTEGER DEFAULT 0 NOT NULL,
					injuries INTEGER DEFAULT 0 NOT NULL,
					knocked_downs INTEGER DEFAULT 0 NOT NULL,
					created_at TEXT NOT NULL,
					updated_at TEXT NOT NULL
				);
				INSERT INTO warbands (id, name, faction, created_at, updated_at)
				VALUES ('warband', 'The Company', 'Reikland', 'created', 'updated');
				INSERT INTO warriors (id, name, class, warband_id, created_at, updated_at)
				VALUES ('warrior', 'Marius', 'Champion', 'warband', 'created', 'updated');
			`);

			applyMigration(db);

			expect(
				db.prepare("SELECT id, is_archived, archived_at FROM warbands").get(),
			).toEqual({ id: "warband", is_archived: 0, archived_at: null });
			expect(
				db.prepare("SELECT id, is_archived, archived_at FROM warriors").get(),
			).toEqual({ id: "warrior", is_archived: 0, archived_at: null });
			expect(() =>
				db.exec("UPDATE warbands SET is_archived = 1 WHERE id = 'warband'"),
			).toThrow();
			expect(() =>
				db.exec("UPDATE warriors SET archived_at = 'now' WHERE id = 'warrior'"),
			).toThrow();
			db.exec(
				"UPDATE warbands SET is_archived = 1, archived_at = 'now' WHERE id = 'warband'",
			);
			expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
		} finally {
			db.close();
		}
	});
});
