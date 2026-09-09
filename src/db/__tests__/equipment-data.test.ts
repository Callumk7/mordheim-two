import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	EquipmentFieldsSchema,
	EquipmentSchema,
} from "@/db/validation/equipment";

const dataDirectory = new URL("../../../data/", import.meta.url);
const catalogues = [
	{ file: "armour.json", count: 18, type: "armour" },
	{ file: "blackpowder.json", count: 20, type: "weapon" },
	{ file: "close-combat.json", count: 65, type: "weapon" },
	{ file: "missile.json", count: 22, type: "weapon" },
];
const entries = catalogues.flatMap(({ file }) =>
	EquipmentFieldsSchema.strict()
		.array()
		.parse(JSON.parse(readFileSync(new URL(file, dataDirectory), "utf8"))),
);

function item(name: string) {
	const entry = entries.find((row) => row.name === name);
	if (!entry) throw new Error(`Missing catalogue item: ${name}`);
	return entry;
}

const exceptionalCosts = [
	["Beastlash", "10 + 1D6 gc"],
	["Brass Knuckles", "20 gc per pair"],
	["Cathayan Longsword", "75 + 2D6 gc"],
	["Dagger", "1st free/2 gc"],
	["Dark Elf Blade", "+ 20 gc"],
	["Fighting Claws", "35 gc per pair"],
	["Gromril Weapon", "4 x Price"],
	["Ithilmar Weapon", "3 x Price"],
	["Obsidian Weapon", "4 x Price"],
	["Weeping Blades", "50 gc per pair"],
	["Cathayan Candles", "25 + 1D6 gc"],
	["Elf Bow", "35 + 3D6 gc"],
	["Double-barrelled Duelling Pistol", "45 + 2D6 gc (80 + 4D6 gc for a brace)"],
	["Double-barrelled Handgun", "60 + 2D6 gc"],
	["Double-barrelled Pistol", "25 + 1D6 gc (46 + 2D6 gc for a brace)"],
	["Duelling Pistol", "30 gc (60 gc for a brace)"],
	["Hand-held Mortar", "80 + 2D6 gc"],
	["Hersten-Wenkler Pigeon Bombs", "30 + 2D6 gc"],
	["Ostlander Double-barrelled Pistol", "30 gc (60 gc for a brace)"],
	["Pistol", "15 gc (30 gc for a brace)"],
	["Repeater Handgun", "60 + 2D6 gc"],
	["Repeater Pistol", "30 + 2D6 gc"],
	["Warplock pistol", "35 gc (70 gc for a brace)"],
] as const;
const unknownCosts = [
	"Bec de Corbin",
	"Fist",
	"Firepots Miragliano",
	"Masterwork Heavy Armour",
];

describe("equipment source catalogue", () => {
	it("covers every JSON file and all 125 distinct source names", () => {
		expect(
			readdirSync(dataDirectory)
				.filter((file) => file.endsWith(".json"))
				.sort(),
		).toEqual(catalogues.map(({ file }) => file).sort());
		expect(entries).toHaveLength(125);
		expect(new Set(entries.map(({ name }) => name)).size).toBe(125);
	});

	it.each(
		catalogues,
	)("$file matches the actual equipment field and create schemas", ({
		file,
		count,
		type,
	}) => {
		const raw = JSON.parse(readFileSync(new URL(file, dataDirectory), "utf8"));
		const parsed = EquipmentFieldsSchema.strict().array().parse(raw);
		expect(parsed).toEqual(raw);
		expect(parsed).toHaveLength(count);
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
			expect(entry.sourceText?.length).toBeGreaterThan(50);
			if (entry.cost !== null)
				expect(entry.sourceText).toContain(`Cost: ${entry.cost}`);
			for (const rule of entry.specialRules) {
				expect(entry.sourceText).toContain(rule);
			}
		}
	});

	it.each(
		exceptionalCosts,
	)("preserves %s's full price expression", (name, cost) => {
		expect(item(name).cost).toBe(cost);
	});

	it("uses null only for the four unstated prices, with simple prices elsewhere", () => {
		expect(
			entries
				.filter(({ cost }) => cost === null)
				.map(({ name }) => name)
				.sort(),
		).toEqual([...unknownCosts].sort());
		const exceptions = new Set<string>(exceptionalCosts.map(([name]) => name));
		for (const entry of entries) {
			if (entry.cost !== null && !exceptions.has(entry.name))
				expect(entry.cost).toMatch(/^\d+ gc$/);
		}
	});

	it("keeps missing profiles and conditional saving effects distinct", () => {
		for (const name of [
			"Cooking Pot Helmet",
			"Helmet",
			"Enchanted Skins",
			"Mechanical Suit",
		]) {
			expect(item(name).save).toBeNull();
		}
		expect(item("Cooking Pot Helmet").sourceText).toContain("5+");
		expect(item("Helmet").sourceText).toContain("4+");
		expect(item("Enchanted Skins").sourceText).toContain("6+");
		expect(item("Mechanical Suit").notes).toContain("no save is stated");
		expect(item("Sunstaff (Lustria)").strength).toBe("As user");
		expect(item("Sunstaff (Lustria)").sourceText).toContain("Strength 4");
		expect(item("Double-barrelled Duelling Pistol").range).toBe('9"');
		expect(item("Duelling Pistol").range).toBe('10"');
	});

	it("retains per-item rules, introductions, tables and editorial qualifications", () => {
		expect(item("Ball and Chain").sourceText).toContain("D6 | Result");
		expect(item("Ball and Chain").sourceText).toContain(
			'2-5 | The model moves 2D6"',
		);
		expect(item("Bolas").sourceText).toContain("once per battle");
		expect(item("Bolas").sourceText).toContain("automatically recovered");
		expect(item("Light Armour").sourceText).toContain(
			"No penalty when worn with a shield",
		);
		expect(item("Heavy Armour").sourceText).toContain(
			"suffers a -1 Movement penalty",
		);
		expect(item("Crossbow pistol").notes).toContain(
			"interaction is not resolved",
		);
		expect(item("Dark Elf Blade").notes).toContain("surcharge");
		expect(item("Brass Knuckles").sourceText).toContain("removed");
	});

	it("retains Swivel Gun's mandatory blackpowder rules and ammunition context", () => {
		expect(item("Swivel Gun").sourceText).toContain(
			"are always in effect for Swivel Guns",
		);
		expect(item("Swivel Gun").range).toBeNull();
		expect(item("Swivel Gun").strength).toBeNull();
		for (const name of ["Ball Shot", "Chain Shot", "Grape Shot"]) {
			expect(item(name).availability).toBeNull();
			expect(item(name).notes).toContain("Ammunition for Swivel Gun");
			expect(item(name).notes).toContain("lasts only that game");
			expect(item(name).sourceUrl).toBe(item("Swivel Gun").sourceUrl);
		}
		expect(item("Grape Shot").sourceText).toContain(
			"There is no Armour Save modifier",
		);
	});
});
