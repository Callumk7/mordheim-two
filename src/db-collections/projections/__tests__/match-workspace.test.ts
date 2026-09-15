import { describe, expect, it } from "vitest";
import type { Event } from "@/db/validation/event";
import type { Match } from "@/db/validation/match";
import type { Warband } from "@/db/validation/warband";
import type { WarbandMatch } from "@/db/validation/warband-match";
import type { Warrior } from "@/db/validation/warrior";
import { type MatchEventRow, projectMatchWorkspace } from "../match-workspace";

const match: Match = {
	id: "match-1",
	name: "The Encounter",
	scenario: "Street Fight",
	status: "InProgress",
	result: "Pending",
	winnerWarbandId: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeWarband(id: string, overrides: Partial<Warband> = {}): Warband {
	return {
		id,
		name: id,
		faction: "Mercenaries",
		bio: null,
		gold: 0,
		rating: 100,
		wins: 0,
		isArchived: false,
		archivedAt: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		...overrides,
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

function makeWarrior(
	id: string,
	warbandId: string,
	overrides: Partial<Warrior> = {},
): Warrior {
	return {
		id,
		name: id,
		class: "Hero",
		status: "Alive",
		warbandId,
		knocked: 0,
		injuries: 0,
		knockedDowns: 0,
		isArchived: false,
		archivedAt: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		...overrides,
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
		outcome: null,
		resolvedAt: null,
		voidedAt: null,
		voidReason: null,
		isProcessed: false,
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
	projectedMatch = match,
	participants = [],
	warriors = [],
}: {
	allWarbands?: Warband[];
	events?: MatchEventRow[];
	projectedMatch?: Match;
	participants?: WarbandMatch[];
	warriors?: Warrior[];
} = {}) {
	return projectMatchWorkspace({
		allWarbands,
		events,
		match: projectedMatch,
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

	it("preserves historical participants but excludes archived entities from play", () => {
		const archivedAt = "2026-02-01T00:00:00.000Z";
		const active = makeWarband("active");
		const archived = makeWarband("archived", {
			isArchived: true,
			archivedAt,
		});
		const workspace = project({
			allWarbands: [active, archived],
			participants: [
				makeParticipant("active-participant", active.id),
				makeParticipant("archived-participant", archived.id),
			],
			warriors: [
				makeWarrior("active-warrior", active.id),
				makeWarrior("archived-warrior", active.id, {
					isArchived: true,
					archivedAt,
				}),
				makeWarrior("active-under-archived", archived.id),
			],
		});

		expect(workspace.warbands.map((warband) => warband.id)).toEqual([
			"active",
			"archived",
		]);
		expect(workspace.eligibleWarbands.map((warband) => warband.id)).toEqual([
			"active",
		]);
		expect(workspace.eligibleWarriors.map((warrior) => warrior.id)).toEqual([
			"active-warrior",
		]);
		expect(workspace.canAddEvent).toBe(false);
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

	it("resolves the winner and prevents events after completion", () => {
		const alpha = makeWarband("alpha");
		const beta = makeWarband("beta");
		const workspace = project({
			allWarbands: [alpha, beta],
			projectedMatch: {
				...match,
				status: "Completed",
				result: "Victory",
				winnerWarbandId: alpha.id,
			},
			participants: [
				makeParticipant("participant-alpha", alpha.id),
				makeParticipant("participant-beta", beta.id),
			],
			warriors: [
				makeWarrior("alpha-warrior", alpha.id),
				makeWarrior("beta-warrior", beta.id),
			],
		});

		expect(workspace.winnerWarband?.id).toBe(alpha.id);
		expect(workspace.canAddEvent).toBe(false);
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
});
