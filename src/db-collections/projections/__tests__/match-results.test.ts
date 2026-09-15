import { describe, expect, it } from "vitest";
import type { Match } from "@/db/validation/match";
import type { Warband } from "@/db/validation/warband";
import type { WarbandMatch } from "@/db/validation/warband-match";
import { projectMatchResults } from "../match-results";

const timestamp = "2026-01-01T00:00:00.000Z";

function warband(id: string, name = id): Warband {
	return {
		id,
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
	};
}

function match(
	id: string,
	result: Match["result"],
	winnerWarbandId: string | null,
	status: Match["status"] = "Completed",
): Match {
	return {
		id,
		name: id,
		scenario: "Skirmish",
		status,
		result,
		winnerWarbandId,
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

describe("projectMatchResults", () => {
	it("counts victories, losses, and draws only for participating warbands", () => {
		const result = projectMatchResults({
			warbands: [warband("red"), warband("blue"), warband("idle")],
			matches: [
				match("red-win", "Victory", "red"),
				match("blue-win", "Victory", "blue"),
				match("draw", "Draw", null),
			],
			participants: [
				participant("1", "red-win", "red"),
				participant("2", "red-win", "blue"),
				participant("3", "blue-win", "red"),
				participant("4", "blue-win", "blue"),
				participant("5", "draw", "red"),
				participant("6", "draw", "blue"),
			],
		});

		expect(result.matchResultRows).toEqual([
			expect.objectContaining({
				id: "blue",
				wins: 1,
				losses: 1,
				draws: 1,
				played: 3,
				winPercentage: 33,
				rank: 1,
			}),
			expect.objectContaining({
				id: "red",
				wins: 1,
				losses: 1,
				draws: 1,
				played: 3,
				winPercentage: 33,
				rank: 1,
			}),
			expect.objectContaining({
				id: "idle",
				wins: 0,
				losses: 0,
				draws: 0,
				played: 0,
				winPercentage: 0,
				rank: 3,
			}),
		]);
		expect(result.leadingMatchResults.map((row) => row.id)).toEqual([
			"blue",
			"red",
		]);
	});

	it("ignores unfinished, pending, orphaned, malformed, and duplicate participation data", () => {
		const result = projectMatchResults({
			warbands: [warband("red"), warband("blue")],
			matches: [
				match("pending", "Pending", null),
				match("scheduled", "Victory", "red", "Scheduled"),
				match("winner-absent", "Victory", "ghost"),
				match("valid", "Victory", "red"),
				match("no-participants", "Draw", null),
			],
			participants: [
				participant("1", "pending", "red"),
				participant("2", "scheduled", "red"),
				participant("3", "winner-absent", "red"),
				participant("4", "valid", "red"),
				participant("5", "valid", "red"),
				participant("6", "valid", "blue"),
				participant("7", "missing-match", "red"),
				participant("8", "valid", "ghost"),
			],
		});

		expect(result.matchResultRows).toEqual([
			expect.objectContaining({ id: "red", wins: 1, played: 1 }),
			expect.objectContaining({ id: "blue", losses: 1, played: 1 }),
		]);
	});

	it("orders leaders deterministically, shares exact-record ranks, and caps the chart at eight", () => {
		const warbands = Array.from({ length: 10 }, (_, index) =>
			warband(`w${index}`, `Warband ${index}`),
		);
		const matches = warbands.map((entry, index) =>
			match(`match-${index}`, "Victory", entry.id),
		);
		const participants = warbands.flatMap((entry, index) => [
			participant(`winner-${index}`, `match-${index}`, entry.id),
			participant(
				`loser-${index}`,
				`match-${index}`,
				warbands[(index + 1) % warbands.length].id,
			),
		]);

		const result = projectMatchResults({ warbands, matches, participants });

		expect(result.matchResultRows.every((row) => row.rank === 1)).toBe(true);
		expect(result.matchResultRows.map((row) => row.name)).toEqual(
			warbands.map((entry) => entry.name),
		);
		expect(result.leadingMatchResults).toHaveLength(8);
	});

	it("ranks a played winless record ahead of an idle warband", () => {
		const result = projectMatchResults({
			warbands: [warband("idle"), warband("red"), warband("blue")],
			matches: [match("loss", "Victory", "blue")],
			participants: [
				participant("1", "loss", "red"),
				participant("2", "loss", "blue"),
			],
		});

		expect(result.matchResultRows.map((row) => row.id)).toEqual([
			"blue",
			"red",
			"idle",
		]);
	});

	it("returns finite zero percentages and an empty leader set without results", () => {
		const result = projectMatchResults({
			warbands: [warband("idle")],
			matches: [],
			participants: [],
		});

		expect(result.matchResultRows[0]).toMatchObject({
			played: 0,
			winPercentage: 0,
		});
		expect(Number.isFinite(result.matchResultRows[0].winPercentage)).toBe(true);
		expect(result.leadingMatchResults).toEqual([]);
	});
});
