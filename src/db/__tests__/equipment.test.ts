import { describe, expect, it } from "vitest";
import {
	EquipmentSchema,
	EquipmentUpdateSchema,
} from "../validation/equipment";
import { WarriorEquipmentSchema } from "../validation/warrior-equipment";

const validEquipment = {
	id: "equipment-1",
	name: "Sword",
	cost: "10 gc",
	availability: "Common",
	range: "Close combat",
	strength: "As user",
	specialRules: ["Parry"],
	type: "weapon" as const,
	save: null,
	sourceUrl: null,
	sourceText: null,
	notes: null,
};

describe("equipment model", () => {
	it("accepts complete weapon and armour records", () => {
		expect(EquipmentSchema.safeParse(validEquipment).success).toBe(true);
		expect(
			EquipmentSchema.safeParse({
				...validEquipment,
				id: "equipment-2",
				type: "armour",
			}).success,
		).toBe(true);
	});

	it("rejects unsupported types, invalid costs, and malformed special rules", () => {
		for (const invalid of [
			{ ...validEquipment, type: "shield" },
			{ ...validEquipment, cost: 10 },
			{ ...validEquipment, cost: " " },
			{ ...validEquipment, specialRules: "Parry" },
			{ ...validEquipment, specialRules: [" "] },
			{ ...validEquipment, range: "" },
			{ ...validEquipment, sourceUrl: "not a URL" },
			{ ...validEquipment, sourceText: " " },
			{ ...validEquipment, notes: " " },
		]) {
			expect(EquipmentSchema.safeParse(invalid).success).toBe(false);
		}
	});

	it("only permits known fields in partial updates", () => {
		expect(EquipmentUpdateSchema.parse({ cost: "15 gc" })).toEqual({
			cost: "15 gc",
		});
		expect(EquipmentUpdateSchema.parse({ cost: null, range: null })).toEqual({
			cost: null,
			range: null,
		});
		expect(EquipmentUpdateSchema.safeParse({ unknown: "field" }).success).toBe(
			false,
		);
	});
});

describe("warrior equipment relation", () => {
	it("requires both sides of an equipment assignment", () => {
		expect(
			WarriorEquipmentSchema.safeParse({
				id: "assignment-1",
				warriorId: "warrior-1",
				equipmentId: "equipment-1",
			}).success,
		).toBe(true);
		expect(
			WarriorEquipmentSchema.safeParse({
				id: "assignment-1",
				warriorId: "warrior-1",
			}).success,
		).toBe(false);
	});
});
