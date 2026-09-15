import { describe, expect, it } from "vitest";
import { WarbandSchema, WarbandUpdateInputSchema } from "../validation/warband";
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

	it("rejects inconsistent archive pairs and archival generic updates", () => {
		for (const schema of [WarriorSchema, WarbandSchema]) {
			expect(
				schema.safeParse({
					...validWarrior,
					faction: "Reikland",
					gold: 0,
					rating: 0,
					wins: 0,
					isArchived: true,
					archivedAt: null,
				}).success,
			).toBe(false);
			expect(
				schema.safeParse({
					...validWarrior,
					faction: "Reikland",
					gold: 0,
					rating: 0,
					wins: 0,
					isArchived: false,
					archivedAt: "2026-01-01T00:00:00.000Z",
				}).success,
			).toBe(false);
		}
		expect(
			WarriorUpdateInputSchema.safeParse({
				id: validWarrior.id,
				changes: { isArchived: true, archivedAt: null },
			}).success,
		).toBe(false);
		expect(
			WarbandUpdateInputSchema.safeParse({
				id: "warband-1",
				changes: {
					isArchived: true,
					archivedAt: "2026-01-01T00:00:00.000Z",
				},
			}).success,
		).toBe(false);
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
