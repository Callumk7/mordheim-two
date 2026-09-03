import { expect, test } from "vitest";
import {
	EventWithRelationsSchema,
	MatchWithRelationsSchema,
	WarbandWithRelationsSchema,
	WarriorWithRelationsSchema,
} from "./relations";

const warband = {
	id: "reavers",
	name: "Reikland Reavers",
	faction: "Mercenaries",
	captain: "Otto Falk",
	rating: 186,
	wins: 7,
	status: "Ready" as const,
};

const match = {
	id: "skirmish",
	name: "Street skirmish",
	scenario: "Skirmish",
	status: "Scheduled" as const,
};

test("warband relation data retains its warriors and linked matches", () => {
	const result = WarbandWithRelationsSchema.parse({
		...warband,
		warriors: [
			{
				id: "otto",
				name: "Otto",
				class: "Captain",
				status: "Alive",
				warbandId: warband.id,
				knocked: 0,
				injuries: 0,
				knockedDowns: 0,
			},
		],
		warbandMatches: [
			{
				id: "reavers-skirmish",
				warbandId: warband.id,
				matchId: match.id,
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
				match,
			},
		],
		attackingEvents: [],
		defendingEvents: [],
	});

	expect(result.warriors?.[0]?.warbandId).toBe(warband.id);
	expect(result.warbandMatches?.[0]?.match.name).toBe(match.name);
});

test("match, warrior, and event relation data retain their parent records", () => {
	const linkedMatch = MatchWithRelationsSchema.parse({
		...match,
		warbandMatches: [
			{
				id: "reavers-skirmish",
				warbandId: warband.id,
				matchId: match.id,
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
				warband,
			},
		],
		events: [],
	});
	const warrior = WarriorWithRelationsSchema.parse({
		id: "otto",
		name: "Otto",
		class: "Captain",
		status: "Alive",
		warbandId: warband.id,
		knocked: 0,
		injuries: 0,
		knockedDowns: 0,
		warband,
	});
	const event = EventWithRelationsSchema.parse({
		id: "knockdown",
		matchId: match.id,
		attackerWarbandId: warband.id,
		defenderWarbandId: "sisters",
		notes: null,
		match,
		attackerWarband: warband,
		defenderWarband: { ...warband, id: "sisters", name: "Silver Hammers" },
	});

	expect(linkedMatch.warbandMatches?.[0]?.warband.id).toBe(warband.id);
	expect(warrior.warband?.name).toBe(warband.name);
	expect(event.match?.id).toBe(match.id);
	expect(event.attackerWarband?.id).toBe(event.attackerWarbandId);
	expect(event.defenderWarband?.id).toBe(event.defenderWarbandId);
});
