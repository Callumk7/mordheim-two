import { DbClient } from "@tanstack/react-db";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Warband } from "@/db/validation/warband";
import type { Warrior } from "@/db/validation/warrior";
import { getCollections } from "@/db-collections";
import {
	createWarbandTransaction,
	deleteWarbandTransaction,
	setWarbandArchivedTransaction,
	updateWarbandTransaction,
} from "../warbands";

// Only the network boundary is doubled: the collections, their schemas and the
// transaction machinery below are the ones the app runs.
const warbandsServer = vi.hoisted(() => ({
	archiveWarband: vi.fn(),
	unarchiveWarband: vi.fn(),
	listWarbands: vi.fn(),
	createWarband: vi.fn(),
	updateWarband: vi.fn(),
	deleteWarband: vi.fn(),
}));
const warriorsServer = vi.hoisted(() => ({
	listWarriors: vi.fn(),
	createWarrior: vi.fn(),
	updateWarrior: vi.fn(),
	deleteWarrior: vi.fn(),
}));

vi.mock("@/server/warbands", () => warbandsServer);
vi.mock("@/server/warriors", () => warriorsServer);

const timestamp = "2026-01-01T00:00:00.000Z";

const warband: Warband = {
	id: "warband-1",
	campaignId: "campaign-1",
	name: "Reikland Reavers",
	faction: "Mercenaries",
	bio: null,
	gold: 500,
	rating: 100,
	wins: 0,
	isArchived: false,
	archivedAt: null,
	createdAt: timestamp,
	updatedAt: timestamp,
};

const warrior: Warrior = {
	id: "warrior-1",
	campaignId: "campaign-1",
	name: "Rolf",
	class: "Hero",
	status: "Alive",
	warbandId: warband.id,
	experience: 0,
	knocked: 0,
	injuries: 0,
	knockedDowns: 0,
	isArchived: false,
	archivedAt: null,
	createdAt: timestamp,
	updatedAt: timestamp,
};

let collections: ReturnType<typeof getCollections>;
let dbClient: DbClient;

beforeEach(async () => {
	for (const fn of [
		...Object.values(warbandsServer),
		...Object.values(warriorsServer),
	]) {
		fn.mockReset();
		fn.mockResolvedValue(undefined);
	}
	warbandsServer.listWarbands.mockResolvedValue([warband]);
	warriorsServer.listWarriors.mockResolvedValue([warrior]);

	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	dbClient = new DbClient({ queryClient });
	collections = getCollections(dbClient);
	await Promise.all([
		collections.warbands.preload(),
		collections.warriors.preload(),
	]);
});

afterEach(() => {
	vi.restoreAllMocks();
});

const newWarband = {
	campaignId: "campaign-1",
	name: "Sisters of Sigmar",
	faction: "Sisters of Sigmar",
	bio: null,
	gold: 275,
	rating: 120,
	wins: 0,
};

describe("createWarbandTransaction", () => {
	it("shows the warband immediately and sends it with a generated identity", async () => {
		const transaction = createWarbandTransaction(collections, newWarband);

		expect(collections.warbands.size).toBe(2);

		await transaction.isPersisted.promise;

		const sent = warbandsServer.createWarband.mock.calls[0][0].data;
		expect(sent).toMatchObject(newWarband);
		expect(sent.id).toEqual(expect.any(String));
		expect(sent.createdAt).toBe(sent.updatedAt);
	});

	it("takes the warband back off the roster when the server rejects it", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		warbandsServer.createWarband.mockRejectedValue(new Error("Name is taken"));

		const transaction = createWarbandTransaction(collections, newWarband);
		await expect(transaction.isPersisted.promise).rejects.toThrow();

		expect(collections.warbands.toArray.map((row) => row.id)).toEqual([
			warband.id,
		]);
	});
});

describe("updateWarbandTransaction", () => {
	it("restores the previous gold when the update is refused", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		warbandsServer.updateWarband.mockRejectedValue(new Error("D1 unavailable"));

		const transaction = updateWarbandTransaction(collections, warband.id, {
			gold: 42,
		});
		expect(collections.warbands.get(warband.id)?.gold).toBe(42);

		await expect(transaction.isPersisted.promise).rejects.toThrow();

		expect(collections.warbands.get(warband.id)?.gold).toBe(warband.gold);
	});
});

describe("setWarbandArchivedTransaction", () => {
	it("optimistically archives and unarchives as a consistent pair", async () => {
		const archivedAt = "2026-02-01T00:00:00.000Z";
		warbandsServer.listWarbands.mockResolvedValue([
			{ ...warband, isArchived: true, archivedAt, updatedAt: archivedAt },
		]);
		const transaction = setWarbandArchivedTransaction(
			collections,
			warband.id,
			true,
			() => archivedAt,
		);
		expect(collections.warbands.get(warband.id)).toMatchObject({
			isArchived: true,
			archivedAt,
			updatedAt: archivedAt,
		});
		await transaction.isPersisted.promise;
		expect(warbandsServer.archiveWarband).toHaveBeenCalledWith({
			data: { id: warband.id },
		});

		collections.warbands.utils.writeUpdate({
			id: warband.id,
			isArchived: true,
			archivedAt,
			updatedAt: archivedAt,
		});
		warbandsServer.listWarbands.mockResolvedValue([warband]);
		const unarchive = setWarbandArchivedTransaction(
			collections,
			warband.id,
			false,
			() => timestamp,
		);
		await unarchive.isPersisted.promise;
		expect(warbandsServer.unarchiveWarband).toHaveBeenCalledWith({
			data: { id: warband.id },
		});
	});
});

describe("deleteWarbandTransaction", () => {
	it("clears the warband and everything it owns in one step", async () => {
		const transaction = deleteWarbandTransaction(
			dbClient,
			collections,
			warband.id,
			{ participantIds: [], warriorIds: [warrior.id], eventIds: [] },
		);

		expect(collections.warbands.get(warband.id)).toBeUndefined();
		expect(collections.warriors.get(warrior.id)).toBeUndefined();

		await transaction.isPersisted.promise;

		expect(warbandsServer.deleteWarband).toHaveBeenCalledExactlyOnceWith({
			data: { id: warband.id },
		});
		// The cascade is the server's job; the client must not delete warriors
		// one-by-one behind its back.
		expect(warriorsServer.deleteWarrior).not.toHaveBeenCalled();
	});

	it("restores the warband and its warriors when deletion is guarded", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		warbandsServer.deleteWarband.mockRejectedValue(
			new Error("Warband has event history and cannot be deleted"),
		);

		const transaction = deleteWarbandTransaction(
			dbClient,
			collections,
			warband.id,
			{ participantIds: [], warriorIds: [warrior.id], eventIds: [] },
		);
		await expect(transaction.isPersisted.promise).rejects.toThrow();

		expect(collections.warbands.get(warband.id)).toMatchObject(warband);
		expect(collections.warriors.get(warrior.id)).toMatchObject(warrior);
	});
});
