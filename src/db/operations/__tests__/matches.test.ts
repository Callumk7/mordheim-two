import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEvent } from "@/db/operations/events.server";
import * as operations from "@/db/operations/matches.server";
import { listWarbandMatches } from "@/db/operations/warband-matches.server";
import { createWarband } from "@/db/operations/warbands.server";
import {
	clock,
	createdAt,
	event,
	match,
	participant,
	seedMatch,
	updatedAt,
	warband,
} from "./fixtures";
import { createTestDatabase } from "./test-database";

let connection: Awaited<ReturnType<typeof createTestDatabase>>;
beforeEach(async () => {
	connection = await createTestDatabase();
}, 30_000);
afterEach(async () => {
	await connection?.dispose();
});

describe("match operations on local D1", () => {
	it("creates, lists, updates with a clock, ignores empty changes, and deletes", async () => {
		const { db } = connection;
		await operations.createMatch(db, match());
		await operations.updateMatch(db, { id: "match", changes: {} }, clock);
		expect(await operations.listMatches(db)).toEqual([match()]);
		await operations.updateMatch(
			db,
			{ id: "match", changes: { name: "Final" } },
			clock,
		);
		expect(await operations.listMatches(db)).toEqual([
			{ ...match(), name: "Final", updatedAt },
		]);
		await operations.deleteMatch(db, { id: "match" });
		expect(await operations.listMatches(db)).toEqual([]);
	});

	it("creates a victory with participants and deletes it with cascading participants", async () => {
		const { db } = connection;
		await createWarband(db, warband());
		const victory = {
			...match(),
			result: "Victory" as const,
			winnerWarbandId: "a",
		};
		await operations.createMatchWithParticipants(db, {
			match: victory,
			participants: [participant()],
		});
		expect(await operations.listMatches(db)).toEqual([victory]);
		expect(await listWarbandMatches(db)).toEqual([participant()]);
		await operations.deleteMatch(db, { id: "match" });
		expect(await operations.listMatches(db)).toEqual([]);
		expect(await listWarbandMatches(db)).toEqual([]);
	});

	it("changes participants and the winner in the existing safe batch order", async () => {
		const { db } = connection;
		await seedMatch(db);
		await operations.updateMatch(
			db,
			{ id: "match", changes: { result: "Victory", winnerWarbandId: "a" } },
			clock,
		);
		await operations.updateMatchWithParticipants(
			db,
			{
				id: "match",
				changes: { winnerWarbandId: "c" },
				additions: [participant("c")],
				removals: ["match-a"],
			},
			clock,
		);
		expect(await operations.listMatches(db)).toEqual([
			{ ...match(), result: "Victory", winnerWarbandId: "c", updatedAt },
		]);
		expect(
			(await listWarbandMatches(db)).map((row) => row.warbandId).sort(),
		).toEqual(["b", "c"]);
	});

	it("rolls back match creation when a later participant violates a foreign key", async () => {
		const { db } = connection;
		await createWarband(db, warband());
		await expect(
			operations.createMatchWithParticipants(db, {
				match: match(),
				participants: [participant(), participant("missing")],
			}),
		).rejects.toThrow();
		expect(await operations.listMatches(db)).toEqual([]);
		expect(await listWarbandMatches(db)).toEqual([]);
	});

	it("rolls back earlier additions and match changes when a later removal is history-protected", async () => {
		const { db } = connection;
		await seedMatch(db);
		await createEvent(db, event());
		const before = await listWarbandMatches(db);
		await expect(
			operations.updateMatchWithParticipants(
				db,
				{
					id: "match",
					changes: { name: "Should roll back" },
					additions: [participant("c")],
					removals: ["match-a"],
				},
				clock,
			),
		).rejects.toThrow();
		expect(await operations.listMatches(db)).toEqual([match()]);
		expect(await listWarbandMatches(db)).toEqual(before);
	});

	it("rejects inconsistent participants and winners before writing", async () => {
		const { db } = connection;
		await seedMatch(db);
		await expect(
			operations.createMatch(db, {
				...match("other"),
				result: "Victory",
				winnerWarbandId: "a",
			}),
		).rejects.toThrow("together with their participants");
		await expect(
			operations.createMatchWithParticipants(db, {
				match: match("other"),
				participants: [participant()],
			}),
		).rejects.toThrow("created match");
		await expect(
			operations.createMatchWithParticipants(db, {
				match: { ...match("other"), result: "Victory", winnerWarbandId: "c" },
				participants: [],
			}),
		).rejects.toThrow("winning warband");
		await expect(
			operations.updateMatch(
				db,
				{ id: "match", changes: { result: "Victory", winnerWarbandId: "c" } },
				clock,
			),
		).rejects.toThrow("winning warband");
		await expect(
			operations.updateMatchWithParticipants(
				db,
				{
					id: "match",
					changes: {},
					additions: [participant("c", "other")],
					removals: [],
				},
				clock,
			),
		).rejects.toThrow("updated match");
		await operations.updateMatch(
			db,
			{ id: "match", changes: { result: "Victory", winnerWarbandId: "a" } },
			clock,
		);
		await expect(
			operations.updateMatchWithParticipants(
				db,
				{ id: "match", changes: {}, additions: [], removals: ["match-a"] },
				clock,
			),
		).rejects.toThrow("winning warband");
		expect(await operations.listMatches(db)).toEqual([
			{ ...match(), result: "Victory", winnerWarbandId: "a", updatedAt },
		]);
	});

	it("preserves missing-match errors, scoped removals, and compound empty-update timestamps", async () => {
		const { db } = connection;
		await expect(
			operations.updateMatch(db, { id: "missing", changes: { name: "No" } }),
		).rejects.toThrow("Match not found.");
		await expect(
			operations.updateMatchWithParticipants(db, {
				id: "missing",
				changes: {},
				additions: [],
				removals: [],
			}),
		).rejects.toThrow("Match not found.");
		await seedMatch(db);
		await operations.createMatchWithParticipants(db, {
			match: match("other"),
			participants: [participant("a", "other")],
		});
		await operations.updateMatchWithParticipants(
			db,
			{ id: "match", changes: {}, additions: [], removals: ["other-a"] },
			clock,
		);
		expect(
			(await listWarbandMatches(db)).some((row) => row.id === "other-a"),
		).toBe(true);
		expect(await operations.listMatches(db)).toContainEqual({
			...match(),
			updatedAt,
		});
		expect(await operations.listMatches(db)).toContainEqual({
			...match("other"),
			updatedAt: createdAt,
		});
	});

	it("rejects deletion of a match with event history without deleting participants", async () => {
		const { db } = connection;
		await seedMatch(db);
		await createEvent(db, event());
		await expect(operations.deleteMatch(db, { id: "match" })).rejects.toThrow(
			"event history",
		);
		expect(await operations.listMatches(db)).toEqual([match()]);
		expect(await listWarbandMatches(db)).toHaveLength(2);
	});
});
