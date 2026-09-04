import { describe, expect, it } from "vitest";
import type { Warband } from "@/db/warband";
import type { WarbandMatch } from "@/db/warband-match";
import type { Warrior } from "@/db/warrior";
import {
	canSubmitEvent,
	changeEventAttackerWarband,
	changeEventDefenderWarband,
	changeEventMatch,
	deriveEventFormOptions,
	type EventFormValues,
	hasDuplicateEventWarbands,
	normalizeEventFormValues,
} from "../event-form";

const now = "2026-01-01T00:00:00.000Z";

function makeWarband(id: string): Warband {
	return {
		id,
		name: id,
		faction: "Mercenaries",
		captain: `${id}-captain`,
		rating: 100,
		wins: 0,
		status: "Ready",
		createdAt: now,
		updatedAt: now,
	};
}

function makeParticipant(matchId: string, warbandId: string): WarbandMatch {
	return {
		id: `${matchId}-${warbandId}`,
		matchId,
		warbandId,
		createdAt: now,
		updatedAt: now,
	};
}

function makeWarrior(id: string, warbandId: string): Warrior {
	return {
		id,
		name: id,
		class: "Hero",
		status: "Alive",
		warbandId,
		knocked: 0,
		injuries: 0,
		knockedDowns: 0,
		createdAt: now,
		updatedAt: now,
	};
}

const participants = [
	makeParticipant("match-1", "alpha"),
	makeParticipant("match-1", "beta"),
	makeParticipant("match-1", "unstaffed"),
	makeParticipant("match-2", "gamma"),
];
const warriors = [
	makeWarrior("alpha-1", "alpha"),
	makeWarrior("alpha-2", "alpha"),
	makeWarrior("beta-1", "beta"),
	makeWarrior("gamma-1", "gamma"),
];
const values: EventFormValues = {
	matchId: "match-1",
	attackerWarbandId: "alpha",
	attackerWarriorId: "alpha-1",
	defenderWarbandId: "beta",
	defenderWarriorId: "beta-1",
	notes: null,
};

describe("event form options", () => {
	it("derives staffed participants and each selected warband's warriors", () => {
		const options = deriveEventFormOptions(
			values,
			participants,
			[
				makeWarband("alpha"),
				makeWarband("beta"),
				makeWarband("unstaffed"),
				makeWarband("gamma"),
			],
			warriors,
		);

		expect(options.participantWarbandIds).toEqual([
			"alpha",
			"beta",
			"unstaffed",
		]);
		expect(options.participantWarbands.map((warband) => warband.id)).toEqual([
			"alpha",
			"beta",
		]);
		expect(options.attackerWarriors.map((warrior) => warrior.id)).toEqual([
			"alpha-1",
			"alpha-2",
		]);
		expect(options.defenderWarriors.map((warrior) => warrior.id)).toEqual([
			"beta-1",
		]);
	});
});

describe("event form selection transitions", () => {
	it("resets both sides to the first staffed participants when match changes", () => {
		const next = changeEventMatch(values, "match-2", participants, warriors);

		expect(next).toEqual({
			...values,
			matchId: "match-2",
			attackerWarbandId: "gamma",
			attackerWarriorId: "gamma-1",
			defenderWarbandId: "",
			defenderWarriorId: "",
		});
	});

	it("clears all combat selections when a match has no staffed participants", () => {
		expect(changeEventMatch(values, "missing", participants, warriors)).toEqual(
			{
				...values,
				matchId: "missing",
				attackerWarbandId: "",
				attackerWarriorId: "",
				defenderWarbandId: "",
				defenderWarriorId: "",
			},
		);
	});

	it("resets only the warrior belonging to the side whose warband changed", () => {
		expect(changeEventAttackerWarband(values, "beta", warriors)).toEqual({
			...values,
			attackerWarbandId: "beta",
			attackerWarriorId: "beta-1",
		});
		expect(changeEventDefenderWarband(values, "unstaffed", warriors)).toEqual({
			...values,
			defenderWarbandId: "unstaffed",
			defenderWarriorId: "",
		});
	});
});

describe("event submit eligibility", () => {
	it("accepts two participating warbands with warriors belonging to each", () => {
		expect(canSubmitEvent(values, participants, warriors)).toBe(true);
	});

	it.each([
		[
			"non-participant",
			{ ...values, defenderWarbandId: "gamma", defenderWarriorId: "gamma-1" },
		],
		[
			"duplicate warbands",
			{ ...values, defenderWarbandId: "alpha", defenderWarriorId: "alpha-2" },
		],
		[
			"attacker warrior from another warband",
			{ ...values, attackerWarriorId: "beta-1" },
		],
		[
			"defender warrior from another warband",
			{ ...values, defenderWarriorId: "alpha-1" },
		],
		["missing warrior", { ...values, defenderWarriorId: "missing" }],
	] as const)("rejects %s", (_label, candidate) => {
		expect(canSubmitEvent(candidate, participants, warriors)).toBe(false);
	});

	it("only reports duplicate warbands after both sides are selected", () => {
		expect(hasDuplicateEventWarbands(values)).toBe(false);
		expect(
			hasDuplicateEventWarbands({ ...values, defenderWarbandId: "alpha" }),
		).toBe(true);
		expect(
			hasDuplicateEventWarbands({
				...values,
				attackerWarbandId: "",
				defenderWarbandId: "",
			}),
		).toBe(false);
	});
});

describe("event notes normalization", () => {
	it("trims non-empty notes and converts blank notes to null", () => {
		expect(
			normalizeEventFormValues({ ...values, notes: "  details  " }).notes,
		).toBe("details");
		expect(normalizeEventFormValues({ ...values, notes: " \n\t " }).notes).toBe(
			null,
		);
		expect(normalizeEventFormValues(values).notes).toBe(null);
	});
});
