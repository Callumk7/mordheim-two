import {
	createCollection,
	createLiveQueryCollection,
	localOnlyCollectionOptions,
	queryOnce,
} from "@tanstack/react-db";
import { describe, expect, it } from "vitest";
import { type Equipment, EquipmentSchema } from "@/db/validation/equipment";
import {
	type WarriorEquipment,
	WarriorEquipmentSchema,
} from "@/db/validation/warrior-equipment";
import {
	equipmentCatalogueQuery,
	warriorEquipmentQuery,
} from "../warrior-equipment";

const timestamp = "2026-01-01T00:00:00.000Z";

function equipment(id: string, name: string): Equipment {
	return {
		id,
		name,
		cost: "10 gc",
		availability: "Common",
		range: "Close combat",
		strength: "As user",
		specialRules: ["Parry"],
		type: "weapon",
		save: null,
		sourceUrl: null,
		sourceText: null,
		notes: "A catalogue note",
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

function assignment(
	id: string,
	warriorId: string,
	equipmentId: string,
): WarriorEquipment {
	return {
		id,
		warriorId,
		equipmentId,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

function createCollections({
	assignments = [],
	catalogue = [],
}: {
	assignments?: WarriorEquipment[];
	catalogue?: Equipment[];
} = {}) {
	return {
		equipment: createCollection(
			localOnlyCollectionOptions({
				id: "equipment",
				getKey: (item: Equipment) => item.id,
				initialData: catalogue,
				schema: EquipmentSchema,
			}),
		),
		warriorEquipment: createCollection(
			localOnlyCollectionOptions({
				id: "warrior-equipment",
				getKey: (item: WarriorEquipment) => item.id,
				initialData: assignments,
				schema: WarriorEquipmentSchema,
			}),
		),
	};
}

describe("warrior equipment queries", () => {
	it("sorts the catalogue for the equipment picker", async () => {
		const collections = createCollections({
			catalogue: [equipment("sword", "Sword"), equipment("axe", "Axe")],
		});

		const result = await queryOnce(equipmentCatalogueQuery(collections));

		expect(result.map((item) => item.name)).toEqual(["Axe", "Sword"]);
	});

	it("displays every assignment, including repeated copies of one item", async () => {
		const sword = equipment("sword", "Sword");
		const collections = createCollections({
			catalogue: [sword],
			assignments: [
				assignment("first-copy", "warrior-1", sword.id),
				assignment("second-copy", "warrior-1", sword.id),
				assignment("other-warrior", "warrior-2", sword.id),
			],
		});

		const result = await queryOnce(
			warriorEquipmentQuery(collections, "warrior-1"),
		);

		expect(result).toHaveLength(2);
		expect(result.map((item) => item.assignmentId).sort()).toEqual([
			"first-copy",
			"second-copy",
		]);
		expect(result[0]).toMatchObject({
			name: "Sword",
			cost: "10 gc",
			availability: "Common",
			range: "Close combat",
			strength: "As user",
			specialRules: ["Parry"],
			notes: "A catalogue note",
		});
	});

	it("keeps the displayed list live after additions and removals", async () => {
		const sword = equipment("sword", "Sword");
		const collections = createCollections({ catalogue: [sword] });
		const displayed = createLiveQueryCollection(
			warriorEquipmentQuery(collections, "warrior-1"),
		);

		try {
			await displayed.preload();
			expect(displayed.toArray).toEqual([]);

			await collections.warriorEquipment.insert(
				assignment("first-copy", "warrior-1", sword.id),
			).isPersisted.promise;
			await collections.warriorEquipment.insert(
				assignment("second-copy", "warrior-1", sword.id),
			).isPersisted.promise;
			expect(displayed.toArray.map((item) => item.assignmentId).sort()).toEqual(
				["first-copy", "second-copy"],
			);

			await collections.warriorEquipment.delete("first-copy").isPersisted
				.promise;
			expect(displayed.toArray.map((item) => item.assignmentId)).toEqual([
				"second-copy",
			]);
		} finally {
			await displayed.cleanup();
		}
	});
});
