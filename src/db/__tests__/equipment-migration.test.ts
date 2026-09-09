import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { equipment } from "@/db/schema";
import { EquipmentSchema } from "@/db/validation/equipment";

const migrationDirectory = new URL("../../../drizzle/", import.meta.url);
const migration = readFileSync(
	new URL("0015_equipment_source_catalogue.sql", migrationDirectory),
	"utf8",
);

function applyMigration(db: DatabaseSync, sql: string) {
	// D1 executes migrations transactionally with foreign keys enabled.
	db.exec("BEGIN");
	try {
		for (const statement of sql.split("--> statement-breakpoint")) {
			db.exec(statement);
		}
		db.exec("COMMIT");
	} catch (error) {
		db.exec("ROLLBACK");
		throw error;
	}
}

function legacyDatabase() {
	const db = new DatabaseSync(":memory:");
	db.exec("PRAGMA foreign_keys = ON");
	// Only the warrior key is needed to exercise both assignment foreign keys.
	db.exec("CREATE TABLE warriors (id TEXT PRIMARY KEY NOT NULL)");
	applyMigration(
		db,
		readFileSync(new URL("0014_cool_callisto.sql", migrationDirectory), "utf8"),
	);
	db.exec("INSERT INTO warriors VALUES ('warrior-1'), ('warrior-2')");
	const insert = db.prepare(`INSERT INTO equipment
		(id, name, cost, availability, range, strength, special_rules, type, save, created_at, updated_at)
		VALUES (?, ?, ?, 'Common', 'Close combat', 'As user', '["Parry"]', 'weapon', '-', '2026-01-01', '2026-02-02')`);
	insert.run("equipment-1", "Legacy weapon", 12.5);
	insert.run("equipment-2", "Legacy zero", 0);
	insert.run("equipment-3", "Legacy multiplier or price", 4);
	db.exec(`INSERT INTO warrior_equipment (id, warrior_id, equipment_id, created_at, updated_at) VALUES
		('assignment-1', 'warrior-1', 'equipment-1', '2026-03-03', '2026-04-04'),
		('assignment-2', 'warrior-2', 'equipment-1', '2026-05-05', '2026-06-06'),
		('assignment-3', 'warrior-1', 'equipment-2', '2026-07-07', '2026-08-08')`);
	return db;
}

describe("0015_equipment_source_catalogue migration", () => {
	it("preserves legacy values, equipment IDs, assignment IDs and timestamps with foreign keys on", () => {
		const db = legacyDatabase();
		try {
			const beforeEquipment = db
				.prepare("SELECT * FROM equipment ORDER BY id")
				.all();
			const beforeAssignments = db
				.prepare("SELECT * FROM warrior_equipment ORDER BY id")
				.all();
			const castCosts = db
				.prepare("SELECT CAST(cost AS TEXT) AS cost FROM equipment ORDER BY id")
				.all();
			applyMigration(db, migration);

			expect(db.prepare("PRAGMA foreign_keys").get()?.foreign_keys).toBe(1);
			expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
			expect(
				db.prepare("SELECT * FROM warrior_equipment ORDER BY id").all(),
			).toEqual(beforeAssignments);
			const afterEquipment = db
				.prepare("SELECT * FROM equipment ORDER BY id")
				.all();
			expect(afterEquipment).toEqual(
				beforeEquipment.map((row, index) => ({
					...row,
					cost: castCosts[index].cost,
					source_url: null,
					source_text: null,
					notes:
						"Legacy numeric cost; original price expression and qualifications were not recorded.",
				})),
			);
			expect(
				db
					.prepare(
						"SELECT name FROM sqlite_schema WHERE substr(name, 1, 2) = '__'",
					)
					.all(),
			).toEqual([]);

			const columns = db.prepare("PRAGMA table_info(equipment)").all();
			expect(
				columns.map(({ name, type, notnull }) => ({ name, type, notnull })),
			).toEqual(
				getTableConfig(equipment).columns.map((column) => ({
					name: column.name,
					type: column.getSQLType().toUpperCase(),
					notnull: column.notNull ? 1 : 0,
				})),
			);
			expect(
				db
					.prepare("PRAGMA index_list(warrior_equipment)")
					.all()
					.map(({ name }) => name),
			).toEqual(
				expect.arrayContaining([
					"warrior_equipment_warrior_idx",
					"warrior_equipment_equipment_idx",
				]),
			);

			const select =
				db.prepare(`SELECT id, name, cost, availability, range, strength, special_rules AS specialRules,
				type, save, source_url AS sourceUrl, source_text AS sourceText, notes, created_at AS createdAt, updated_at AS updatedAt FROM equipment`);
			for (const row of select.all()) {
				expect(
					EquipmentSchema.safeParse({
						...row,
						specialRules: JSON.parse(String(row.specialRules)),
					}).success,
				).toBe(true);
			}

			const insert = db.prepare(`INSERT INTO equipment
				(id, name, cost, availability, range, strength, special_rules, type, save, source_url, source_text, notes)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
			for (const file of ["armour", "close-combat", "missile", "blackpowder"]) {
				const rows = JSON.parse(
					readFileSync(
						new URL(`../../../data/${file}.json`, import.meta.url),
						"utf8",
					),
				);
				for (const [index, row] of rows.entries()) {
					insert.run(
						`${file}-${index}`,
						row.name,
						row.cost,
						row.availability,
						row.range,
						row.strength,
						JSON.stringify(row.specialRules),
						row.type,
						row.save,
						row.sourceUrl,
						row.sourceText,
						row.notes,
					);
				}
			}
			expect(
				db.prepare("SELECT COUNT(*) AS count FROM equipment").get()?.count,
			).toBe(128);
			expect(() =>
				db.exec(
					"INSERT INTO warrior_equipment (id, warrior_id, equipment_id) VALUES ('bad', 'warrior-1', 'missing')",
				),
			).toThrow();
			expect(() =>
				db.exec(
					"INSERT INTO warrior_equipment (id, warrior_id, equipment_id) VALUES ('bad', 'missing', 'equipment-1')",
				),
			).toThrow();
			expect(() =>
				db.exec(
					"UPDATE equipment SET type = 'invalid' WHERE id = 'equipment-1'",
				),
			).toThrow();
			db.exec("DELETE FROM equipment WHERE id = 'equipment-1'");
			expect(
				db.prepare("SELECT id FROM warrior_equipment ORDER BY id").all(),
			).toEqual([{ id: "assignment-3" }]);
			db.exec("DELETE FROM warriors WHERE id = 'warrior-1'");
			expect(db.prepare("SELECT * FROM warrior_equipment").all()).toEqual([]);
		} finally {
			db.close();
		}
	});

	it("rolls back parent and assignment changes on a migration failure", () => {
		const db = legacyDatabase();
		try {
			const beforeEquipment = db
				.prepare("SELECT * FROM equipment ORDER BY id")
				.all();
			const beforeAssignments = db
				.prepare("SELECT * FROM warrior_equipment ORDER BY id")
				.all();
			expect(() =>
				applyMigration(
					db,
					`${migration}\n--> statement-breakpoint\nSELECT * FROM deliberately_missing_table;`,
				),
			).toThrow();
			expect(db.prepare("SELECT * FROM equipment ORDER BY id").all()).toEqual(
				beforeEquipment,
			);
			expect(
				db.prepare("SELECT * FROM warrior_equipment ORDER BY id").all(),
			).toEqual(beforeAssignments);
			expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
		} finally {
			db.close();
		}
	});
});
