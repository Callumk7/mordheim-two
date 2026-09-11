import {
	createCollection,
	localOnlyCollectionOptions,
	queryOnce,
} from "@tanstack/react-db";
import { describe, expect, it } from "vitest";
import { type Event, EventSchema } from "@/db/validation/event";
import { type Warband, WarbandSchema } from "@/db/validation/warband";
import { type Warrior, WarriorSchema } from "@/db/validation/warrior";
import {
	warriorEventReferencesQuery,
	warriorQuery,
	warriorsQuery,
	warriorWarbandsQuery,
} from "../warrior-specifications";

const timestamp = "2026-01-01T00:00:00.000Z";

function warrior(id: string, name: string): Warrior {
	return {
		id,
		name,
		class: "Hero",
		status: "Alive",
		warbandId: "warband-1",
		knocked: 0,
		injuries: 0,
		knockedDowns: 0,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

function warband(id: string, name: string): Warband {
	return {
		id,
		name,
		faction: "Mercenaries",
		bio: null,
		gold: 0,
		rating: 100,
		wins: 0,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

function event(
	id: string,
	attackerWarriorId: string,
	defenderWarriorId: string,
): Event {
	return {
		id,
		matchId: "match-1",
		attackerWarbandId: "warband-1",
		attackerWarriorId,
		defenderWarbandId: "warband-2",
		defenderWarriorId,
		notes: null,
		outcome: null,
		resolvedAt: null,
		voidedAt: null,
		voidReason: null,
		isProcessed: false,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

describe("warrior query specifications", () => {
	it("orders warrior and warband lists by name", async () => {
		const warriors = createCollection(
			localOnlyCollectionOptions({
				id: "warriors",
				getKey: (item: Warrior) => item.id,
				initialData: [warrior("2", "Zed"), warrior("1", "Alpha")],
				schema: WarriorSchema,
			}),
		);
		const warbands = createCollection(
			localOnlyCollectionOptions({
				id: "warbands",
				getKey: (item: Warband) => item.id,
				initialData: [warband("2", "Zeta"), warband("1", "Aldorf")],
				schema: WarbandSchema,
			}),
		);

		await expect(queryOnce(warriorsQuery({ warriors }))).resolves.toMatchObject(
			[
				{ id: "1", name: "Alpha" },
				{ id: "2", name: "Zed" },
			],
		);
		await expect(
			queryOnce(warriorWarbandsQuery({ warbands })),
		).resolves.toMatchObject([
			{ id: "1", name: "Aldorf" },
			{ id: "2", name: "Zeta" },
		]);
	});

	it("selects one warrior and every event that references them", async () => {
		const warriors = createCollection(
			localOnlyCollectionOptions({
				id: "warriors",
				getKey: (item: Warrior) => item.id,
				initialData: [warrior("target", "Target"), warrior("other", "Other")],
				schema: WarriorSchema,
			}),
		);
		const events = createCollection(
			localOnlyCollectionOptions({
				id: "events",
				getKey: (item: Event) => item.id,
				initialData: [
					event("attacking", "target", "other"),
					event("defending", "other", "target"),
					event("both", "target", "target"),
					event("unrelated", "other", "other"),
				],
				schema: EventSchema,
			}),
		);

		await expect(
			queryOnce(warriorQuery({ warriors }, "target")),
		).resolves.toMatchObject([{ id: "target", name: "Target" }]);

		const references = await queryOnce(
			warriorEventReferencesQuery({ events }, "target"),
		);
		expect(references.map((reference) => reference.id).sort()).toEqual([
			"attacking",
			"both",
			"defending",
		]);
	});
});
