import { describe, expect, it } from "vitest";
import type { Event } from "@/db/validation/event";
import type { Match } from "@/db/validation/match";
import type { Warband } from "@/db/validation/warband";
import type { WarbandMatch } from "@/db/validation/warband-match";
import type { Warrior } from "@/db/validation/warrior";
import { projectWarbandDashboard } from "../warband-dashboard";

const timestamp = "2026-01-01T00:00:00.000Z";

function warband(id: string): Warband {
	return {
		id,
		name: id === "red" ? "Red Reavers" : "Blue Blades",
		faction: "Mercenaries",
		captain: "Captain",
		rating: 100,
		wins: 0,
		status: "Ready",
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

function warrior(
	id: string,
	warbandId: string,
	status: Warrior["status"] = "Alive",
): Warrior {
	return {
		id,
		name: id,
		class: "Hero",
		status,
		warbandId,
		knocked: 0,
		injuries: 0,
		knockedDowns: 0,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

function match(
	id: string,
	result: Match["result"],
	winnerWarbandId: string | null,
	createdAt = timestamp,
): Match {
	return {
		id,
		name: id,
		scenario: "Skirmish",
		status: result === "Pending" ? "Scheduled" : "Completed",
		result,
		winnerWarbandId,
		createdAt,
		updatedAt: createdAt,
	};
}

function participant(
	id: string,
	matchId: string,
	warbandId: string,
): WarbandMatch {
	return { id, matchId, warbandId, createdAt: timestamp, updatedAt: timestamp };
}

function event(id: string, overrides: Partial<Event> = {}): Event {
	return {
		id,
		matchId: "win",
		attackerWarbandId: "red",
		attackerWarriorId: "red-hero",
		defenderWarbandId: "blue",
		defenderWarriorId: "blue-hero",
		notes: null,
		outcome: "Injury",
		resolvedAt: "2026-01-02T00:00:00.000Z",
		voidedAt: null,
		voidReason: null,
		isProcessed: true,
		createdAt: "2026-01-02T00:00:00.000Z",
		updatedAt: "2026-01-02T00:00:00.000Z",
		...overrides,
	};
}

describe("projectWarbandDashboard", () => {
	it("calculates match results only for matches involving the warband", () => {
		const dashboard = projectWarbandDashboard({
			warbandId: "red",
			warbands: [warband("red"), warband("blue")],
			warriors: [],
			matches: [
				match("win", "Victory", "red", "2026-01-01T00:00:00.000Z"),
				match("loss", "Victory", "blue", "2026-01-02T00:00:00.000Z"),
				match("draw", "Draw", null, "2026-01-03T00:00:00.000Z"),
				match("pending", "Pending", null, "2026-01-04T00:00:00.000Z"),
				match("unrelated", "Victory", "blue"),
			],
			participants: [
				participant("p1", "win", "red"),
				participant("p2", "loss", "red"),
				participant("p3", "draw", "red"),
				participant("p4", "pending", "red"),
				participant("p5", "unrelated", "blue"),
			],
			events: [],
		});

		expect(
			dashboard.matches.map(({ id, outcome }) => ({ id, outcome })),
		).toEqual([
			{ id: "pending", outcome: "Pending" },
			{ id: "draw", outcome: "Draw" },
			{ id: "loss", outcome: "Loss" },
			{ id: "win", outcome: "Win" },
		]);
		expect(dashboard.matchStats).toEqual({
			played: 3,
			wins: 1,
			losses: 1,
			draws: 1,
			winRate: 33,
		});
	});

	it("builds an event log, leaderboard, living roster, and event-derived graveyard", () => {
		const warriors = [
			warrior("red-hero", "red"),
			warrior("red-fallen", "red"),
			warrior("red-memorial", "red", "Dead"),
			warrior("blue-hero", "blue"),
		];
		const events = [
			event("older"),
			event("death", {
				attackerWarbandId: "blue",
				attackerWarriorId: "blue-hero",
				defenderWarbandId: "red",
				defenderWarriorId: "red-fallen",
				outcome: "Death",
				createdAt: "2026-01-03T00:00:00.000Z",
				resolvedAt: "2026-01-03T00:01:00.000Z",
			}),
			event("unrelated", {
				attackerWarbandId: "blue",
				defenderWarbandId: "green",
			}),
		];
		const dashboard = projectWarbandDashboard({
			warbandId: "red",
			warbands: [warband("red"), warband("blue")],
			warriors,
			matches: [match("win", "Victory", "red")],
			participants: [],
			events,
		});

		expect(dashboard.events.map((row) => row.id)).toEqual(["death", "older"]);
		expect(dashboard.events[0]).toMatchObject({
			attackerName: "Blue Blades",
			attackerWarriorName: "blue-hero",
			defenderName: "Red Reavers",
			defenderWarriorName: "red-fallen",
			matchName: "win",
		});
		expect(dashboard.livingRoster.map((row) => row.id)).toEqual(["red-hero"]);
		expect(dashboard.graveyard).toEqual([
			expect.objectContaining({
				id: "red-fallen",
				killerName: "blue-hero",
				matchName: "win",
			}),
			expect.objectContaining({
				id: "red-memorial",
				killerName: null,
				matchName: null,
			}),
		]);
		expect(dashboard.warriorLeaderboard.map((row) => row.id)).toEqual([
			"red-hero",
			"red-fallen",
			"red-memorial",
		]);
	});

	it("returns graceful empty collections and zero statistics", () => {
		const dashboard = projectWarbandDashboard({
			warbandId: "missing",
			warbands: [],
			warriors: [],
			matches: [],
			participants: [],
			events: [],
		});

		expect(dashboard.events).toEqual([]);
		expect(dashboard.graveyard).toEqual([]);
		expect(dashboard.livingRoster).toEqual([]);
		expect(dashboard.matches).toEqual([]);
		expect(dashboard.warriorLeaderboard).toEqual([]);
		expect(dashboard.matchStats).toEqual({
			played: 0,
			wins: 0,
			losses: 0,
			draws: 0,
			winRate: 0,
		});
	});
});
