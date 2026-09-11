import { getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { warriors } from "../schema";
import { WarriorSchema, WarriorUpdateInputSchema } from "../validation/warrior";

const validWarrior = {
	id: "warrior-1",
	name: "Marius",
	class: "Champion",
	status: "Alive" as const,
	warbandId: "warband-1",
	knocked: 0,
	injuries: 0,
	knockedDowns: 0,
};

describe("warrior validation", () => {
	it("accepts signed integer combat corrections and rejects fractional values", () => {
		expect(
			WarriorSchema.parse({
				...validWarrior,
				knocked: -2,
				injuries: 3,
				knockedDowns: -1,
			}),
		).toMatchObject({ knocked: -2, injuries: 3, knockedDowns: -1 });
		expect(
			WarriorSchema.safeParse({ ...validWarrior, injuries: 0.5 }).success,
		).toBe(false);
	});

	it("persists as a nullable text column for existing rows", () => {
		const description = getTableConfig(warriors).columns.find(
			(column) => column.name === "description",
		);

		expect(description).toBeDefined();
		expect(description?.dataType).toBe("string");
		expect(description?.notNull).toBe(false);
	});

	it("accepts omitted, null, and populated descriptions", () => {
		expect(WarriorSchema.parse(validWarrior).description).toBeUndefined();
		expect(
			WarriorSchema.parse({ ...validWarrior, description: null }).description,
		).toBeNull();
		expect(
			WarriorSchema.parse({
				...validWarrior,
				description: "  A scarred veteran in a crimson hood.  ",
			}).description,
		).toBe("A scarred veteran in a crimson hood.");
	});

	it("allows description-only updates, including clearing the field", () => {
		expect(
			WarriorUpdateInputSchema.parse({
				id: validWarrior.id,
				changes: { description: "  Carries a blackened shield.  " },
			}),
		).toEqual({
			id: validWarrior.id,
			changes: { description: "Carries a blackened shield." },
		});
		expect(
			WarriorUpdateInputSchema.parse({
				id: validWarrior.id,
				changes: { description: null },
			}).changes.description,
		).toBeNull();
	});
});
