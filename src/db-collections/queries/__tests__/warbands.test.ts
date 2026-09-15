import {
	createCollection,
	localOnlyCollectionOptions,
	queryOnce,
} from "@tanstack/react-db";
import { describe, expect, it } from "vitest";
import { type Warband, WarbandSchema } from "@/db/validation/warband";
import { type Warrior, WarriorSchema } from "@/db/validation/warrior";
import { warbandsQuery } from "../warbands";

const timestamp = "2026-01-01T00:00:00.000Z";

function warband(id: string, isArchived = false): Warband {
	return WarbandSchema.parse({
		id,
		name: id,
		faction: "Mercenaries",
		bio: null,
		gold: 0,
		rating: 100,
		wins: 0,
		isArchived,
		archivedAt: isArchived ? timestamp : null,
		createdAt: timestamp,
		updatedAt: timestamp,
	});
}

function warrior(id: string, warbandId: string, isArchived = false): Warrior {
	return WarriorSchema.parse({
		id,
		name: id,
		class: "Hero",
		status: "Alive",
		warbandId,
		knocked: 0,
		injuries: 0,
		knockedDowns: 0,
		isArchived,
		archivedAt: isArchived ? timestamp : null,
		createdAt: timestamp,
		updatedAt: timestamp,
	});
}

describe("warband index query", () => {
	it("hides archived warbands and roster members unless requested", async () => {
		const warbands = createCollection(
			localOnlyCollectionOptions({
				id: "warband-index-warbands",
				getKey: (row: Warband) => row.id,
				initialData: [warband("active"), warband("archived", true)],
				schema: WarbandSchema,
			}),
		);
		const warriors = createCollection(
			localOnlyCollectionOptions({
				id: "warband-index-warriors",
				getKey: (row: Warrior) => row.id,
				initialData: [
					warrior("active-warrior", "active"),
					warrior("archived-warrior", "active", true),
				],
				schema: WarriorSchema,
			}),
		);

		const activeRows = await queryOnce(warbandsQuery({ warbands, warriors }));
		expect(activeRows).toHaveLength(1);
		expect(activeRows[0].warriors.map((row) => row.id)).toEqual([
			"active-warrior",
		]);

		const allRows = await queryOnce(
			warbandsQuery({ warbands, warriors }, true),
		);
		expect(allRows).toHaveLength(2);
		expect(
			allRows.find((row) => row.id === "active")?.warriors.map((row) => row.id),
		).toEqual(["active-warrior", "archived-warrior"]);
	});
});
