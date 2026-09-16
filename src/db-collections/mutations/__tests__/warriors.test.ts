import { DbClient } from "@tanstack/react-db";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Event } from "@/db/validation/event";
import type { Warrior } from "@/db/validation/warrior";
import { getCollections } from "@/db-collections";
import {
	createWarriorTransaction,
	deleteWarriorTransaction,
	updateWarriorTransaction,
} from "../warriors";

// Only the network boundary is doubled: the collections, their schemas and the
// transaction machinery below are the ones the app runs.
const warriorsServer = vi.hoisted(() => ({
	listWarriors: vi.fn(),
	createWarrior: vi.fn(),
	updateWarrior: vi.fn(),
	deleteWarrior: vi.fn(),
}));
const eventsServer = vi.hoisted(() => ({
	listEvents: vi.fn(),
	createEvent: vi.fn(),
	updateEvent: vi.fn(),
	resolveEvent: vi.fn(),
	voidEvent: vi.fn(),
}));

vi.mock("@/server/warriors", () => warriorsServer);
vi.mock("@/server/events", () => eventsServer);

const timestamp = "2026-01-01T00:00:00.000Z";

const warrior: Warrior = {
	id: "warrior-1",
	campaignId: "campaign-1",
	name: "Rolf",
	class: "Hero",
	status: "Alive",
	warbandId: "warband-1",
	experience: 0,
	knocked: 0,
	injuries: 0,
	knockedDowns: 0,
	isArchived: false,
	archivedAt: null,
	createdAt: timestamp,
	updatedAt: timestamp,
};

const event: Event = {
	id: "event-1",
	campaignId: "campaign-1",
	matchId: "match-1",
	attackerWarbandId: "warband-1",
	attackerWarriorId: warrior.id,
	defenderWarbandId: "warband-2",
	defenderWarriorId: "warrior-2",
	notes: null,
	outcome: null,
	resolvedAt: null,
	voidedAt: null,
	voidReason: null,
	isProcessed: false,
	createdAt: timestamp,
	updatedAt: timestamp,
};

const newWarrior = {
	campaignId: "campaign-1",
	name: "Marta",
	class: "Champion",
	status: "Alive" as const,
	warbandId: "warband-1",
	experience: 0,
	knocked: 0,
	injuries: 0,
	knockedDowns: 0,
};

let collections: ReturnType<typeof getCollections>;
let dbClient: DbClient;

beforeEach(async () => {
	for (const fn of [
		...Object.values(warriorsServer),
		...Object.values(eventsServer),
	]) {
		fn.mockReset();
		fn.mockResolvedValue(undefined);
	}
	warriorsServer.listWarriors.mockResolvedValue([warrior]);
	eventsServer.listEvents.mockResolvedValue([event]);

	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	dbClient = new DbClient({ queryClient });
	collections = getCollections(dbClient);
	await Promise.all([
		collections.warriors.preload(),
		collections.events.preload(),
	]);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("createWarriorTransaction", () => {
	it("recruits the warrior immediately and sends a generated identity", async () => {
		const transaction = createWarriorTransaction(collections, newWarrior);

		expect(collections.warriors.size).toBe(2);

		await transaction.isPersisted.promise;

		const sent = warriorsServer.createWarrior.mock.calls[0][0].data;
		expect(sent).toMatchObject(newWarrior);
		expect(sent.id).toEqual(expect.any(String));
	});

	it("removes the recruit again when the server rejects it", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		warriorsServer.createWarrior.mockRejectedValue(
			new Error("Warband no longer exists"),
		);

		const transaction = createWarriorTransaction(collections, newWarrior);
		await expect(transaction.isPersisted.promise).rejects.toThrow();

		expect(collections.warriors.toArray.map((row) => row.id)).toEqual([
			warrior.id,
		]);
	});
});

describe("updateWarriorTransaction", () => {
	it("restores the previous corrections when the update is refused", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		warriorsServer.updateWarrior.mockRejectedValue(new Error("D1 unavailable"));

		const transaction = updateWarriorTransaction(collections, warrior.id, {
			knockedDowns: -2,
			description: "Scarred",
		});
		expect(collections.warriors.get(warrior.id)?.knockedDowns).toBe(-2);

		await expect(transaction.isPersisted.promise).rejects.toThrow();

		expect(collections.warriors.get(warrior.id)).toMatchObject(warrior);
	});
});

describe("deleteWarriorTransaction", () => {
	it("removes the warrior together with the events named for deletion", async () => {
		const transaction = deleteWarriorTransaction(
			dbClient,
			collections,
			warrior.id,
			[event.id],
		);

		expect(collections.warriors.get(warrior.id)).toBeUndefined();
		expect(collections.events.get(event.id)).toBeUndefined();

		await transaction.isPersisted.promise;

		expect(warriorsServer.deleteWarrior).toHaveBeenCalledExactlyOnceWith({
			data: { id: warrior.id },
		});
	});

	it("restores the warrior and their events when history protects them", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		warriorsServer.deleteWarrior.mockRejectedValue(
			new Error("Warrior has event history and cannot be deleted"),
		);

		const transaction = deleteWarriorTransaction(
			dbClient,
			collections,
			warrior.id,
			[event.id],
		);
		await expect(transaction.isPersisted.promise).rejects.toThrow();

		expect(collections.warriors.get(warrior.id)).toMatchObject(warrior);
		expect(collections.events.get(event.id)).toMatchObject(event);
	});
});
