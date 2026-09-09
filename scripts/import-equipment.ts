import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	EquipmentFieldsSchema,
	EquipmentSchema,
} from "@/db/validation/equipment";

const root = fileURLToPath(new URL("../", import.meta.url));
const database = "mordheim-two-db";
const catalogueFiles = [
	"armour.json",
	"blackpowder.json",
	"close-combat.json",
	"missile.json",
];

const columns = {
	name: "name",
	cost: "cost",
	availability: "availability",
	range: "range",
	strength: "strength",
	specialRules: "special_rules",
	type: "type",
	save: "save",
	sourceUrl: "source_url",
	sourceText: "source_text",
	notes: "notes",
} as const;

function sqlText(value: string | null) {
	if (value === null) return "NULL";
	// SQLite SQL text cannot contain a literal NUL. Fail before any execution.
	if (value.includes("\0"))
		throw new Error("Equipment text contains a NUL byte");
	return `'${value.replaceAll("'", "''")}'`;
}

export function buildEquipmentImport(dataDirectory = join(root, "data")) {
	const identities = new Map<string, string>();
	const records = catalogueFiles.flatMap((file) => {
		const path = join(dataDirectory, file);
		const result = EquipmentFieldsSchema.strict()
			.array()
			.safeParse(JSON.parse(readFileSync(path, "utf8")));
		if (!result.success) {
			throw new Error(`Invalid equipment in ${file}: ${result.error.message}`);
		}
		return result.data.map((fields, index) => {
			// Names distinguish ammunition records sharing the Swivel Gun URL.
			const identity = JSON.stringify([fields.sourceUrl, fields.name]);
			const id = `equipment-catalogue-${createHash("sha256").update(identity).digest("hex")}`;
			const location = `${file}[${index}] (${fields.name})`;
			if (identities.has(id)) {
				throw new Error(
					`Duplicate equipment identity: ${location} and ${identities.get(id)}`,
				);
			}
			identities.set(id, location);
			return EquipmentSchema.parse({ ...fields, id });
		});
	});
	if (records.length === 0) throw new Error("Equipment catalogue is empty");

	const sqlColumns = Object.values(columns);
	const statements = records.map((record) => {
		const values = Object.keys(columns).map((key) => {
			const value = record[key as keyof typeof columns];
			return sqlText(Array.isArray(value) ? JSON.stringify(value) : value);
		});
		return `INSERT INTO equipment (id, ${sqlColumns.join(", ")})
VALUES (${sqlText(record.id)}, ${values.join(", ")})
ON CONFLICT(id) DO UPDATE SET
${sqlColumns.map((column) => `${column} = excluded.${column}`).join(",\n")},
updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE ${sqlColumns.map((column) => `equipment.${column} IS NOT excluded.${column}`).join(" OR ")};`;
	});
	return { records, sql: `${statements.join("\n\n")}\n` };
}

const usage = `Usage: pnpm exec tsx scripts/import-equipment.ts (--local | --remote) [--dry-run] [--confirm-remote]
Imports the four equipment catalogues into mordheim-two-db. Apply migrations separately first.
--dry-run validates and builds SQL without invoking Wrangler or writing files.
Remote writes require --remote --confirm-remote. No target is selected by default.`;

export function runEquipmentImport(
	args: string[],
	dataDirectory = join(root, "data"),
) {
	if (args.length === 1 && args[0] === "--help") {
		console.log(usage);
		return;
	}
	const allowed = ["--local", "--remote", "--dry-run", "--confirm-remote"];
	if (
		args.some((arg) => !allowed.includes(arg)) ||
		new Set(args).size !== args.length ||
		args.includes("--local") === args.includes("--remote") ||
		(args.includes("--confirm-remote") && !args.includes("--remote"))
	) {
		throw new Error(usage);
	}
	const remote = args.includes("--remote");
	const dryRun = args.includes("--dry-run");
	if (remote && !dryRun && !args.includes("--confirm-remote")) {
		throw new Error(
			"Remote writes require --confirm-remote. Review --dry-run first.",
		);
	}

	// All files and SQL literals must pass validation before creating files or spawning Wrangler.
	const { records, sql } = buildEquipmentImport(dataDirectory);
	const target = remote ? "--remote" : "--local";
	console.log(
		`Validated ${records.length} equipment records for ${database} ${target} (${Buffer.byteLength(sql)} SQL bytes).`,
	);
	if (dryRun) {
		console.log("Dry run: no files written and no database contacted.");
		return;
	}

	const temporary = mkdtempSync(join(tmpdir(), "mordheim-equipment-"));
	try {
		const file = join(temporary, "equipment.sql");
		writeFileSync(file, sql, { mode: 0o600 });
		execFileSync(
			"pnpm",
			[
				"exec",
				"wrangler",
				"d1",
				"execute",
				database,
				target,
				"--config",
				join(root, "wrangler.jsonc"),
				"--file",
				file,
				"--yes",
			],
			{ cwd: root, stdio: "inherit" },
		);
		console.log(`Equipment import completed for ${database} ${target}.`);
	} finally {
		rmSync(temporary, { recursive: true, force: true });
	}
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	try {
		runEquipmentImport(process.argv.slice(2));
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	}
}
