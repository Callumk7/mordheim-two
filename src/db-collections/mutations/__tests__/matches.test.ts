import { DbClient } from "@tanstack/react-db";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Match } from "@/db/validation/match";
import type { WarbandMatch } from "@/db/validation/warband-match";
import { getCollections } from "@/db-collections";
import {
	createMatchTransaction,
	deleteMatchTransaction,
	updateMatchTransaction,
} from "../matches";

// Only the network boundary is doubled: the collections, their schemas and the
// transaction machinery below are the ones the app runs.
const server = vi.hoisted(() => ({
	listMatches: vi.fn(),
	createMatch: vi.fn(),
	createMatchWithParticipants: vi.fn(),
	updateMatch: vi.fn(),
	updateMatchWithParticipants: vi.fn(),
	deleteMatch: vi.fn(),
}));
const participantsServer = vi.hoisted(() => ({
	listWarbandMatches: vi.fn(),
	createWarbandMatch: vi.fn(),
	deleteWarbandMatch: vi.fn(),
}));

vi.mock("@/server/matches", () => server);
vi.mock("@/server/warband-matches", () => participantsServer);

const timestamp = "2026-01-01T00:00:00.000Z";

const match: Match = {
	id: "match-1",
	campaignId: "campaign-1",
	name: "The Encounter",
	scenario: "Street Fight",
	status: "Scheduled",
	result: "Pending",
	winnerWarbandId: null,
	createdAt: timestamp,
	updatedAt: timestamp,
};

function participant(id: string, warbandId: string): WarbandMatch {
	return {
		id,
		matchId: match.id,
		warbandId,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

const alpha = participant("participant-alpha", "warband-alpha");
const beta = participant("participant-beta", "warband-beta");

let collections: ReturnType<typeof getCollections>;
let dbClient: DbClient;

beforeEach(async () => {
	for (const fn of [
		...Object.values(server),
		...Object.values(participantsServer),
	]) {
		fn.mockReset();
		fn.mockResolvedValue(undefined);
	}
	server.listMatches.mockResolvedValue([match]);
	participantsServer.listWarbandMatches.mockResolvedValue([alpha]);

	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	dbClient = new DbClient({ queryClient });
	collections = getCollections(dbClient);
	await Promise.all([
		collections.matches.preload(),
		collections.warbandMatches.preload(),
	]);
});

afterEach(() => {
	vi.restoreAllMocks();
});

function participantIds() {
	return collections.warbandMatches.toArray.map((row) => row.id).sort();
}

describe("createMatchTransaction", () => {
	it("sends the match and its participants together in one call", async () => {
		const created = { ...match, id: "match-2", name: "The Crossing" };
		const rows = [participant("new-alpha", "warband-alpha")];

		const transaction = createMatchTransaction(
			dbClient,
			collections,
			created,
			rows,
		);

		// Both appear at once: a match that shows without its participants would
		// read as an empty fixture.
		expect(collections.matches.get("match-2")).toMatchObject(created);
		expect(participantIds()).toContain("new-alpha");

		await transaction.isPersisted.promise;

		expect(server.createMatchWithParticipants).toHaveBeenCalledExactlyOnceWith({
			data: { match: created, participants: rows },
		});
	});

	it("rolls the match and its participants back together when the server rejects", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		server.createMatchWithParticipants.mockRejectedValue(
			new Error("Participants must exist"),
		);
		const created = { ...match, id: "match-2" };

		const transaction = createMatchTransaction(dbClient, collections, created, [
			participant("new-alpha", "warband-alpha"),
		]);
		await expect(transaction.isPersisted.promise).rejects.toThrow();

		expect(collections.matches.get("match-2")).toBeUndefined();
		expect(participantIds()).toEqual([alpha.id]);
	});

	it("creates a match with no participants at all", async () => {
		const created = { ...match, id: "match-2" };
		await createMatchTransaction(dbClient, collections, created, []).isPersisted
			.promise;

		expect(server.createMatchWithParticipants).toHaveBeenCalledExactlyOnceWith({
			data: { match: created, participants: [] },
		});
		expect(participantIds()).toEqual([alpha.id]);
	});
});

describe("updateMatchTransaction", () => {
	it("uses the plain match update when the participants are unchanged", async () => {
		const transaction = updateMatchTransaction(dbClient, collections, {
			id: match.id,
			changes: { name: "Renamed" },
			additions: [],
			removals: [],
		});

		expect(collections.matches.get(match.id)?.name).toBe("Renamed");

		await transaction.isPersisted.promise;

		expect(server.updateMatch).toHaveBeenCalledExactlyOnceWith({
			data: { id: match.id, changes: { name: "Renamed" } },
		});
		expect(server.updateMatchWithParticipants).not.toHaveBeenCalled();
	});

	it("sends changes, additions and removals as one participant update", async () => {
		const transaction = updateMatchTransaction(dbClient, collections, {
			id: match.id,
			changes: { name: "Renamed" },
			additions: [beta],
			removals: [alpha],
		});

		expect(participantIds()).toEqual([beta.id]);

		await transaction.isPersisted.promise;

		expect(server.updateMatchWithParticipants).toHaveBeenCalledExactlyOnceWith({
			data: {
				id: match.id,
				changes: { name: "Renamed" },
				additions: [beta],
				// Removals travel as IDs; the records themselves stay client-side for
				// the rollback.
				removals: [alpha.id],
			},
		});
		expect(server.updateMatch).not.toHaveBeenCalled();
	});

	it("restores the match name and both participant edits when the server rejects", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		server.updateMatchWithParticipants.mockRejectedValue(
			new Error("Participant is referenced by event history"),
		);

		const transaction = updateMatchTransaction(dbClient, collections, {
			id: match.id,
			changes: { name: "Renamed" },
			additions: [beta],
			removals: [alpha],
		});
		await expect(transaction.isPersisted.promise).rejects.toThrow();

		expect(collections.matches.get(match.id)?.name).toBe(match.name);
		expect(participantIds()).toEqual([alpha.id]);
	});

	it("keeps a confirmed participant change without refetching", async () => {
		await updateMatchTransaction(dbClient, collections, {
			id: match.id,
			changes: { name: "Renamed" },
			additions: [beta],
			removals: [alpha],
		}).isPersisted.promise;

		expect(collections.matches.get(match.id)?.name).toBe("Renamed");
		expect(participantIds()).toEqual([beta.id]);
	});
});

describe("deleteMatchTransaction", () => {
	it("removes the match with everything that hangs off it", async () => {
		const transaction = deleteMatchTransaction(
			dbClient,
			collections,
			match.id,
			[alpha.id],
			[],
		);

		expect(collections.matches.get(match.id)).toBeUndefined();
		expect(participantIds()).toEqual([]);

		await transaction.isPersisted.promise;

		expect(server.deleteMatch).toHaveBeenCalledExactlyOnceWith({
			data: { id: match.id },
		});
	});

	it("puts the match and its participants back when deletion is refused", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		server.deleteMatch.mockRejectedValue(
			new Error("Match has event history and cannot be deleted"),
		);

		const transaction = deleteMatchTransaction(
			dbClient,
			collections,
			match.id,
			[alpha.id],
			[],
		);
		await expect(transaction.isPersisted.promise).rejects.toThrow();

		expect(collections.matches.get(match.id)).toMatchObject(match);
		expect(participantIds()).toEqual([alpha.id]);
	});
});
