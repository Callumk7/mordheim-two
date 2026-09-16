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

function warrior(
	id: string,
	name: string,
	overrides: Partial<Warrior> = {},
): Warrior {
	return {
		id,
		campaignId: "campaign-1",
		name,
		class: "Hero",
		status: "Alive",
		warbandId: "warband-1",
		experience: 0,
		knocked: 0,
		injuries: 0,
		knockedDowns: 0,
		isArchived: false,
		archivedAt: null,
		createdAt: timestamp,
		updatedAt: timestamp,
		...overrides,
	};
}

function warband(
	id: string,
	name: string,
	overrides: Partial<Warband> = {},
): Warband {
	return {
		id,
		campaignId: "campaign-1",
		name,
		faction: "Mercenaries",
		bio: null,
		gold: 0,
		rating: 100,
		wins: 0,
		isArchived: false,
		archivedAt: null,
		createdAt: timestamp,
		updatedAt: timestamp,
		...overrides,
	};
}

function event(
	id: string,
	attackerWarriorId: string,
	defenderWarriorId: string,
): Event {
	return {
		id,
		campaignId: "campaign-1",
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
				initialData: [warband("2", "Zeta"), warband("warband-1", "Aldorf")],
				schema: WarbandSchema,
			}),
		);

		await expect(
			queryOnce(warriorsQuery({ warbands, warriors }, "campaign-1")),
		).resolves.toMatchObject([
			{ id: "1", name: "Alpha" },
			{ id: "2", name: "Zed" },
		]);
		await expect(
			queryOnce(warriorWarbandsQuery({ warbands }, "campaign-1")),
		).resolves.toMatchObject([
			{ id: "warband-1", name: "Aldorf" },
			{ id: "2", name: "Zeta" },
		]);
	});

	it("hides archived warriors and warriors whose warband is archived by default", async () => {
		const warriors = createCollection(
			localOnlyCollectionOptions({
				id: "archive-warriors",
				getKey: (item: Warrior) => item.id,
				initialData: [
					warrior("active", "Active"),
					warrior("archived", "Archived", {
						isArchived: true,
						archivedAt: timestamp,
					}),
					warrior("hidden-by-parent", "Hidden", {
						warbandId: "archived-warband",
					}),
				],
				schema: WarriorSchema,
			}),
		);
		const warbands = createCollection(
			localOnlyCollectionOptions({
				id: "archive-warbands",
				getKey: (item: Warband) => item.id,
				initialData: [
					warband("warband-1", "Active"),
					warband("archived-warband", "Archived", {
						isArchived: true,
						archivedAt: timestamp,
					}),
				],
				schema: WarbandSchema,
			}),
		);

		expect(
			(
				await queryOnce(warriorsQuery({ warbands, warriors }, "campaign-1"))
			).map((row) => row.id),
		).toEqual(["active"]);
		expect(
			(
				await queryOnce(
					warriorsQuery({ warbands, warriors }, "campaign-1", true),
				)
			)
				.map((row) => row.id)
				.sort(),
		).toEqual(["active", "archived", "hidden-by-parent"]);
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
