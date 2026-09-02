import assert from "node:assert/strict";
import test from "node:test";
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

	assert.equal(result.warriors?.[0]?.warbandId, warband.id);
	assert.equal(result.warbandMatches?.[0]?.match.name, match.name);
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

	assert.equal(linkedMatch.warbandMatches?.[0]?.warband.id, warband.id);
	assert.equal(warrior.warband?.name, warband.name);
	assert.equal(event.match?.id, match.id);
	assert.equal(event.attackerWarband?.id, event.attackerWarbandId);
	assert.equal(event.defenderWarband?.id, event.defenderWarbandId);
});
