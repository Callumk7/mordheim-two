import { describe, expect, it } from "vitest";
import type { Event } from "@/db/event";
import type { Match } from "@/db/match";
import type { Warband } from "@/db/warband";
import type { WarbandMatch } from "@/db/warband-match";
import type { Warrior } from "@/db/warrior";
import { type MatchEventRow, projectMatchWorkspace } from "../match-workspace";

const match: Match = {
	id: "match-1",
	name: "The Encounter",
	scenario: "Street Fight",
	status: "InProgress",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeWarband(id: string): Warband {
	return {
		id,
		name: id,
		faction: "Mercenaries",
		captain: `${id}-captain`,
		rating: 100,
		wins: 0,
		status: "Ready",
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	};
}

function makeParticipant(id: string, warbandId: string): WarbandMatch {
	return {
		id,
		matchId: match.id,
		warbandId,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
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
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	};
}

function makeEvent(
	id: string,
	attackerWarbandId: string,
	defenderWarbandId: string,
): MatchEventRow {
	const event: Event = {
		id,
		matchId: match.id,
		attackerWarbandId,
		attackerWarriorId: `${attackerWarbandId}-warrior`,
		defenderWarbandId,
		defenderWarriorId: `${defenderWarbandId}-warrior`,
		notes: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	};

	return {
		...event,
		attackerName: attackerWarbandId,
		attackerWarriorName: event.attackerWarriorId,
		defenderName: defenderWarbandId,
		defenderWarriorName: event.defenderWarriorId,
	};
}

function project({
	allWarbands = [],
	events = [],
	participants = [],
	warriors = [],
}: {
	allWarbands?: Warband[];
	events?: MatchEventRow[];
	participants?: WarbandMatch[];
	warriors?: Warrior[];
} = {}) {
	return projectMatchWorkspace({
		allWarbands,
		events,
		match,
		participants,
		warriors,
	});
}

describe("projectMatchWorkspace", () => {
	it("includes only participating warbands and groups their warriors", () => {
		const alpha = makeWarband("alpha");
		const beta = makeWarband("beta");
		const outsider = makeWarband("outsider");
		const alphaWarrior = makeWarrior("alpha-warrior", alpha.id);
		const outsiderWarrior = makeWarrior("outsider-warrior", outsider.id);

		const workspace = project({
			allWarbands: [alpha, beta, outsider],
			participants: [
				makeParticipant("participant-alpha", alpha.id),
				makeParticipant("participant-beta", beta.id),
			],
			warriors: [alphaWarrior, outsiderWarrior],
		});

		expect(workspace.warbands).toEqual([
			{ ...alpha, warriors: [alphaWarrior] },
			{ ...beta, warriors: [] },
		]);
		expect(workspace.staffedWarbands.map((warband) => warband.id)).toEqual([
			alpha.id,
		]);
	});

	it("allows event creation only when two participating warbands are staffed", () => {
		const alpha = makeWarband("alpha");
		const beta = makeWarband("beta");
		const participants = [
			makeParticipant("participant-alpha", alpha.id),
			makeParticipant("participant-beta", beta.id),
		];

		expect(
			project({
				allWarbands: [alpha, beta],
				participants,
				warriors: [makeWarrior("alpha-warrior", alpha.id)],
			}).canAddEvent,
		).toBe(false);
		expect(
			project({
				allWarbands: [alpha, beta],
				participants,
				warriors: [
					makeWarrior("alpha-warrior", alpha.id),
					makeWarrior("beta-warrior", beta.id),
				],
			}).canAddEvent,
		).toBe(true);
	});

	it("does not expose match capabilities before the match is available", () => {
		const alpha = makeWarband("alpha");
		const beta = makeWarband("beta");
		const workspace = projectMatchWorkspace({
			allWarbands: [alpha, beta],
			events: [],
			match: undefined,
			participants: [
				makeParticipant("participant-alpha", alpha.id),
				makeParticipant("participant-beta", beta.id),
			],
			warriors: [
				makeWarrior("alpha-warrior", alpha.id),
				makeWarrior("beta-warrior", beta.id),
			],
		});

		expect(workspace.canAddEvent).toBe(false);
	});

	it("deduplicates warbands referenced by events when calculating locks", () => {
		const workspace = project({
			events: [
				makeEvent("event-1", "alpha", "beta"),
				makeEvent("event-2", "alpha", "gamma"),
			],
		});

		expect(workspace.lockedParticipantWarbandIds).toEqual([
			"alpha",
			"beta",
			"gamma",
		]);
	});

	it("preserves source records needed by consumers", () => {
		const alpha = makeWarband("alpha");
		const participant = makeParticipant("participant-alpha", alpha.id);
		const event = makeEvent("event-1", "alpha", "beta");
		const warrior = makeWarrior("alpha-warrior", alpha.id);
		const workspace = project({
			allWarbands: [alpha],
			events: [event],
			participants: [participant],
			warriors: [warrior],
		});

		expect(workspace.match).toBe(match);
		expect(workspace.allWarbands).toEqual([alpha]);
		expect(workspace.events).toEqual([event]);
		expect(workspace.participants).toEqual([participant]);
		expect(workspace.warriors).toEqual([warrior]);
	});
});
