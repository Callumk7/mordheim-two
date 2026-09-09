import { execFileSync, spawnSync } from "node:child_process";
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildEquipmentImport,
	runEquipmentImport,
} from "../../../scripts/import-equipment";

vi.mock("node:child_process", async (importOriginal) => ({
	...(await importOriginal<typeof import("node:child_process")>()),
	execFileSync: vi.fn(),
}));

const root = fileURLToPath(new URL("../../../", import.meta.url));
const fixture = {
	name: "Captain's Sword; -- not SQL",
	cost: "10 + 1D6 gc",
	availability: "Common",
	range: "Close Combat",
	strength: "As user",
	specialRules: ["Parry", 'It\'s a rule;\nwith "quotes" and \\slashes'],
	type: "weapon",
	save: null,
	sourceUrl: "https://example.com/equipment#sword",
	sourceText:
		"First line.\nIt's a 'quoted' rule; DROP TABLE equipment; --\nLast line.",
	notes: null,
};
let directory: string;

function writeCatalogue(rows: unknown) {
	writeFileSync(join(directory, "armour.json"), JSON.stringify(rows));
}

function scratchDatabase() {
	const db = new DatabaseSync(":memory:");
	db.exec(
		"PRAGMA foreign_keys = ON; CREATE TABLE warriors (id TEXT PRIMARY KEY)",
	);
	for (const migration of [
		"0014_cool_callisto.sql",
		"0015_equipment_source_catalogue.sql",
	]) {
		db.exec(readFileSync(join(root, "drizzle", migration), "utf8"));
	}
	return db;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, "log").mockImplementation(() => {});
	directory = mkdtempSync(join(tmpdir(), "equipment-import-test-"));
	for (const file of ["armour", "blackpowder", "close-combat", "missile"]) {
		writeFileSync(join(directory, `${file}.json`), "[]");
	}
	writeCatalogue([fixture]);
});

afterEach(() => {
	rmSync(directory, { recursive: true, force: true });
	vi.restoreAllMocks();
});

describe("import-equipment validation and SQL", () => {
	it("imports all 125 catalogue records into scratch SQLite and re-runs without changes", () => {
		const { records, sql } = buildEquipmentImport();
		expect(records).toHaveLength(125);
		expect(new Set(records.map(({ id }) => id)).size).toBe(125);
		const ammunition = records.filter(({ name }) =>
			["Swivel Gun", "Ball Shot", "Chain Shot", "Grape Shot"].includes(name),
		);
		expect(ammunition).toHaveLength(4);
		expect(new Set(ammunition.map(({ sourceUrl }) => sourceUrl)).size).toBe(1);
		expect(new Set(ammunition.map(({ id }) => id)).size).toBe(4);
		const db = scratchDatabase();
		try {
			db.exec(sql);
			const before = db.prepare("SELECT * FROM equipment ORDER BY id").all();
			db.exec(sql);
			expect(db.prepare("SELECT * FROM equipment ORDER BY id").all()).toEqual(
				before,
			);
			expect(before).toHaveLength(125);
		} finally {
			db.close();
		}
	});

	it.each([
		["numeric cost", [{ ...fixture, cost: 10 }]],
		["missing field", [{ ...fixture, save: undefined }]],
		["unknown field", [{ ...fixture, typo: true }]],
		["caller-supplied ID", [{ ...fixture, id: "manual-id" }]],
		["blank rule", [{ ...fixture, specialRules: [" "] }]],
		["not an array", fixture],
		["empty catalogue", []],
		["NUL in SQL text", [{ ...fixture, sourceText: "invalid\0text" }]],
	])("rejects %s before invoking Wrangler", (_name, rows) => {
		writeCatalogue(rows);
		expect(() => runEquipmentImport(["--local"], directory)).toThrow();
		expect(execFileSync).not.toHaveBeenCalled();
	});

	it("rejects invalid JSON or a missing file, even after valid files", () => {
		writeFileSync(join(directory, "missile.json"), "[");
		expect(() => runEquipmentImport(["--local"], directory)).toThrow();
		rmSync(join(directory, "missile.json"));
		expect(() => runEquipmentImport(["--local"], directory)).toThrow();
		expect(execFileSync).not.toHaveBeenCalled();
	});

	it("rejects identities duplicated across files after schema trimming", () => {
		writeFileSync(
			join(directory, "missile.json"),
			JSON.stringify([{ ...fixture, name: ` ${fixture.name} ` }]),
		);
		expect(() => runEquipmentImport(["--local"], directory)).toThrow(
			/Duplicate equipment identity.*missile.json.*armour.json/,
		);
		expect(execFileSync).not.toHaveBeenCalled();
	});

	it("round-trips SQL text/JSON/nulls, preserves creation and assignments, and does not name-merge manual rows", () => {
		const initial = buildEquipmentImport(directory);
		const id = initial.records[0].id;
		const db = scratchDatabase();
		try {
			db.exec(initial.sql);
			const row = db.prepare("SELECT * FROM equipment WHERE id = ?").get(id);
			expect(row).toMatchObject({
				name: fixture.name,
				cost: fixture.cost,
				source_text: fixture.sourceText,
				save: null,
				notes: null,
				special_rules: JSON.stringify(fixture.specialRules),
			});
			db.prepare(
				"UPDATE equipment SET created_at = 'original', updated_at = 'old' WHERE id = ?",
			).run(id);
			db.exec("INSERT INTO warriors VALUES ('warrior-1')");
			db.prepare(
				"INSERT INTO warrior_equipment (id, warrior_id, equipment_id) VALUES ('assignment', 'warrior-1', ?)",
			).run(id);
			db.prepare(
				"INSERT INTO equipment (id, name, type, special_rules) VALUES ('manual', ?, 'weapon', '[]')",
			).run(fixture.name);
			const manual = db
				.prepare("SELECT * FROM equipment WHERE id = 'manual'")
				.get();
			const assignment = db.prepare("SELECT * FROM warrior_equipment").all();

			writeCatalogue([{ ...fixture, cost: null, notes: "Updated catalogue" }]);
			const updated = buildEquipmentImport(directory);
			expect(updated.records[0].id).toBe(id);
			db.exec(updated.sql);
			expect(
				db.prepare("SELECT * FROM equipment WHERE id = ?").get(id),
			).toMatchObject({
				created_at: "original",
				cost: null,
				notes: "Updated catalogue",
				updated_at: expect.not.stringMatching(/^old$/),
			});
			expect(db.prepare("SELECT * FROM warrior_equipment").all()).toEqual(
				assignment,
			);
			expect(
				db.prepare("SELECT * FROM equipment WHERE id = 'manual'").get(),
			).toEqual(manual);
			expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);

			writeCatalogue([{ ...fixture, name: "Renamed" }]);
			expect(buildEquipmentImport(directory).records[0].id).not.toBe(id);
		} finally {
			db.close();
		}
	});
});

describe("import-equipment CLI", () => {
	it.each([
		[],
		["--local", "--remote"],
		["--local", "--local"],
		["--remote"],
		["--local", "--confirm-remote"],
		["--local", "--unknown"],
		["--dry-run"],
	])("rejects unsafe or ambiguous arguments %j", (...args) => {
		expect(() => runEquipmentImport(args, directory)).toThrow();
		expect(execFileSync).not.toHaveBeenCalled();
	});

	it.each([
		"--local",
		"--remote",
	])("dry-runs %s without invoking Wrangler", (target) => {
		runEquipmentImport([target, "--dry-run"], directory);
		expect(execFileSync).not.toHaveBeenCalled();
		expect(console.log).toHaveBeenCalledWith(
			"Dry run: no files written and no database contacted.",
		);
	});

	it.each([
		"--local",
		"--remote",
	])("passes the explicit %s target and cleans up SQL", (target) => {
		let sqlFile = "";
		vi.mocked(execFileSync).mockImplementationOnce((_command, args) => {
			const options = args as string[];
			expect(options).toContain(target);
			expect(options).not.toContain(
				target === "--local" ? "--remote" : "--local",
			);
			expect(options.slice(0, 5)).toEqual([
				"exec",
				"wrangler",
				"d1",
				"execute",
				"mordheim-two-db",
			]);
			expect(options).toContain(join(root, "wrangler.jsonc"));
			sqlFile = options[options.indexOf("--file") + 1];
			expect(readFileSync(sqlFile, "utf8")).toContain(
				"ON CONFLICT(id) DO UPDATE",
			);
			return Buffer.from("");
		});
		runEquipmentImport(
			target === "--remote" ? [target, "--confirm-remote"] : [target],
			directory,
		);
		expect(execFileSync).toHaveBeenCalledOnce();
		expect(existsSync(dirname(sqlFile))).toBe(false);
	});

	it("propagates Wrangler failure and cleans temporary files", () => {
		let sqlFile = "";
		vi.mocked(execFileSync).mockImplementationOnce((_command, args) => {
			const options = args as string[];
			sqlFile = options[options.indexOf("--file") + 1];
			throw new Error("Wrangler failed");
		});
		expect(() => runEquipmentImport(["--local"], directory)).toThrow(
			"Wrangler failed",
		);
		expect(existsSync(dirname(sqlFile))).toBe(false);
	});

	it("has a working tsx entrypoint and exits nonzero for rejected arguments", () => {
		for (const [args, status, message] of [
			[["--local", "--dry-run"], 0, "Validated 125 equipment records"],
			[["--remote", "--dry-run"], 0, "Dry run: no files written"],
			[["--remote"], 1, "Remote writes require --confirm-remote"],
			[[], 1, "Usage:"],
		] as const) {
			const result = spawnSync(
				process.execPath,
				["--import", "tsx", "scripts/import-equipment.ts", ...args],
				{ cwd: root, encoding: "utf8" },
			);
			expect(result.status, result.stderr).toBe(status);
			expect(result.stdout + result.stderr).toContain(message);
		}
	});
});
