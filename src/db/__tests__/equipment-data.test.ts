import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	EquipmentFieldsSchema,
	EquipmentSchema,
} from "@/db/validation/equipment";

const dataDirectory = new URL("../../../data/", import.meta.url);
const catalogues = [
	{ file: "armour.json", type: "armour" },
	{ file: "blackpowder.json", type: "weapon" },
	{ file: "close-combat.json", type: "weapon" },
	{ file: "missile.json", type: "weapon" },
];
const entries = catalogues.flatMap(({ file }) =>
	EquipmentFieldsSchema.strict()
		.array()
		.parse(JSON.parse(readFileSync(new URL(file, dataDirectory), "utf8"))),
);

// These assert invariants the importer relies on, not the catalogue's contents:
// editing a price or a rule's wording is a data decision and must not fail here.
describe("equipment source catalogue", () => {
	it("imports every JSON file in the data directory under unique names", () => {
		expect(
			readdirSync(dataDirectory)
				.filter((file) => file.endsWith(".json"))
				.sort(),
		).toEqual(catalogues.map(({ file }) => file).sort());
		expect(new Set(entries.map(({ name }) => name)).size).toBe(entries.length);
	});

	it.each(catalogues)("$file parses strictly as equipment of its own type", ({
		file,
		type,
	}) => {
		const raw = JSON.parse(readFileSync(new URL(file, dataDirectory), "utf8"));
		const parsed = EquipmentFieldsSchema.strict().array().parse(raw);

		// Strict parsing must not drop or coerce anything on the way through.
		expect(parsed).toEqual(raw);
		expect(parsed.length).toBeGreaterThan(0);
		for (const [index, entry] of parsed.entries()) {
			expect(entry.type).toBe(type);
			expect(
				EquipmentSchema.safeParse({ ...entry, id: `${file}-${index}` }).success,
			).toBe(true);
			expect(entry.sourceUrl).toMatch(
				new RegExp(
					`^https://mordheimer\\.net/docs/weapons-armour/${file.replace(".json", "")}#.+`,
				),
			);
		}
	});

	it("keeps prices as source expressions rather than coerced numbers", () => {
		for (const entry of entries) {
			expect(entry.cost === null || typeof entry.cost === "string").toBe(true);
		}
	});
});
