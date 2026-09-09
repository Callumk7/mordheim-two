import {
	createCollection,
	createLiveQueryCollection,
	localOnlyCollectionOptions,
	queryOnce,
} from "@tanstack/react-db";
import { describe, expect, it } from "vitest";
import { type Event, EventSchema } from "@/db/validation/event";
import { type Match, MatchSchema } from "@/db/validation/match";
import { type Warband, WarbandSchema } from "@/db/validation/warband";
import {
	type WarbandMatch,
	WarbandMatchSchema,
} from "@/db/validation/warband-match";
import { type Warrior, WarriorSchema } from "@/db/validation/warrior";
import {
	matchEventsQuery,
	matchParticipantsQuery,
	matchRosterQuery,
} from "../match-specifications";

const timestamp = "2026-01-01T00:00:00.000Z";

function createCollections({
	events = [],
	participants = [],
	warbands = [],
	warriors = [],
}: {
	events?: Event[];
	participants?: WarbandMatch[];
	warbands?: Warband[];
	warriors?: Warrior[];
} = {}) {
	return {
		events: createCollection(
			localOnlyCollectionOptions({
				id: "events",
				getKey: (event: Event) => event.id,
				initialData: events,
				schema: EventSchema,
			}),
		),
		matches: createCollection(
			localOnlyCollectionOptions({
				id: "matches",
				getKey: (match: Match) => match.id,
				schema: MatchSchema,
			}),
		),
		warbandMatches: createCollection(
			localOnlyCollectionOptions({
				id: "warband-matches",
				getKey: (participant: WarbandMatch) => participant.id,
				initialData: participants,
				schema: WarbandMatchSchema,
			}),
		),
		warbands: createCollection(
			localOnlyCollectionOptions({
				id: "warbands",
				getKey: (warband: Warband) => warband.id,
				initialData: warbands,
				schema: WarbandSchema,
			}),
		),
		warriors: createCollection(
			localOnlyCollectionOptions({
				id: "warriors",
				getKey: (warrior: Warrior) => warrior.id,
				initialData: warriors,
				schema: WarriorSchema,
			}),
		),
	};
}

function warband(id: string, name = id): Warband {
	return {
		id,
		name,
		faction: "Mercenaries",
		captain: `${id} captain`,
		rating: 100,
		wins: 0,
		status: "Ready",
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

function warrior(id: string, warbandId: string, name = id): Warrior {
	return {
		id,
		name,
		class: "Hero",
		status: "Alive",
		warbandId,
		knocked: 0,
		injuries: 0,
		knockedDowns: 0,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

function participant(
	id: string,
	matchId: string,
	warbandId: string,
): WarbandMatch {
	return { id, matchId, warbandId, createdAt: timestamp, updatedAt: timestamp };
}

function event(id: string, createdAt: string, matchId = "match-1"): Event {
	return {
		id,
		matchId,
		attackerWarbandId: "alpha",
		attackerWarriorId: "alpha-warrior",
		defenderWarbandId: "beta",
		defenderWarriorId: "beta-warrior",
		notes: `${id} notes`,
		outcome: null,
		resolvedAt: null,
		voidedAt: null,
		voidReason: null,
		isProcessed: false,
		createdAt,
		updatedAt: createdAt,
	};
}

describe("match query specifications", () => {
	it("filters participants and roster members to the match", async () => {
		const collections = createCollections({
			participants: [
				participant("alpha-match-1", "match-1", "alpha"),
				participant("beta-match-2", "match-2", "beta"),
			],
			warriors: [
				warrior("alpha-warrior", "alpha", "Alpha"),
				warrior("beta-warrior", "beta", "Beta"),
			],
		});

		await expect(
			queryOnce(matchParticipantsQuery(collections, "match-1")),
		).resolves.toMatchObject([{ id: "alpha-match-1", matchId: "match-1" }]);
		await expect(
			queryOnce(matchRosterQuery(collections, "match-1")),
		).resolves.toMatchObject([
			{ id: "alpha-warrior", warbandId: "alpha", name: "Alpha" },
		]);
	});

	it("joins event relations, selects event display fields, and orders newest first", async () => {
		const collections = createCollections({
			events: [
				event("older", "2026-01-01T00:00:00.000Z"),
				event("newer", "2026-01-02T00:00:00.000Z"),
				event("other-match", "2026-01-03T00:00:00.000Z", "match-2"),
			],
			warbands: [warband("alpha", "Alpha Band"), warband("beta", "Beta Band")],
			warriors: [
				warrior("alpha-warrior", "alpha", "Alpha Hero"),
				warrior("beta-warrior", "beta", "Beta Hero"),
			],
		});

		const rows = await queryOnce(matchEventsQuery(collections, "match-1"));

		expect(rows.map((row) => row.id)).toEqual(["newer", "older"]);
		expect(rows[0]).toMatchObject({
			attackerName: "Alpha Band",
			attackerWarriorName: "Alpha Hero",
			defenderName: "Beta Band",
			defenderWarriorName: "Beta Hero",
			notes: "newer notes",
		});
	});

	it("updates a derived roster after its source collection changes", async () => {
		const collections = createCollections({
			participants: [participant("alpha-match-1", "match-1", "alpha")],
			warriors: [warrior("alpha-warrior", "alpha", "Alpha")],
		});
		const roster = createLiveQueryCollection(
			matchRosterQuery(collections, "match-1"),
		);

		try {
			await roster.preload();
			expect(roster.toArray.map((row) => row.name)).toEqual(["Alpha"]);

			await collections.warriors.insert(warrior("second", "alpha", "Bravo"))
				.isPersisted.promise;

			expect(roster.toArray.map((row) => row.name)).toEqual(["Alpha", "Bravo"]);
		} finally {
			await roster.cleanup();
		}
	});
});
