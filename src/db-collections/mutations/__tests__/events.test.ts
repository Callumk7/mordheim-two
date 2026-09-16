import { DbClient } from "@tanstack/react-db";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Event } from "@/db/validation/event";
import { getCollections } from "@/db-collections";
import {
	createEventTransaction,
	setEventOutcomeTransaction,
	updateEventTransaction,
	voidEventTransaction,
} from "../events";

// Only the network boundary is doubled: the collections, their schemas and the
// transaction machinery below are the ones the app runs.
const server = vi.hoisted(() => ({
	listEvents: vi.fn(),
	createEvent: vi.fn(),
	updateEvent: vi.fn(),
	resolveEvent: vi.fn(),
	voidEvent: vi.fn(),
}));

vi.mock("@/server/events", () => server);

const timestamp = "2026-01-01T00:00:00.000Z";

const existing: Event = {
	id: "event-1",
	campaignId: "campaign-1",
	matchId: "match-1",
	attackerWarbandId: "warband-a",
	attackerWarriorId: "warrior-a",
	defenderWarbandId: "warband-b",
	defenderWarriorId: "warrior-b",
	notes: null,
	outcome: null,
	resolvedAt: null,
	voidedAt: null,
	voidReason: null,
	isProcessed: false,
	createdAt: timestamp,
	updatedAt: timestamp,
};

const newEventValues = {
	campaignId: "campaign-1",
	matchId: "match-1",
	attackerWarbandId: "warband-a",
	attackerWarriorId: "warrior-a",
	defenderWarbandId: "warband-b",
	defenderWarriorId: "warrior-b",
	notes: "An ambush",
};

let collections: ReturnType<typeof getCollections>;

beforeEach(async () => {
	for (const fn of Object.values(server)) fn.mockReset();
	server.listEvents.mockResolvedValue([existing]);
	server.createEvent.mockResolvedValue(undefined);
	server.updateEvent.mockResolvedValue(undefined);
	server.resolveEvent.mockResolvedValue(undefined);
	server.voidEvent.mockResolvedValue(undefined);

	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	collections = getCollections(new DbClient({ queryClient }));
	await collections.events.preload();
});

afterEach(() => {
	vi.restoreAllMocks();
});

function stored(id: string) {
	return collections.events.get(id);
}

/** The payload a mocked server function was called with. */
function sentTo(fn: (typeof server)["createEvent"]) {
	const call = (fn.mock.calls as unknown as Array<[{ data: Event }]>)[0];
	if (!call) throw new Error("Server function was not called");
	return call[0].data;
}

describe("createEventTransaction", () => {
	it("shows the new event immediately and sends it as an unresolved fact", async () => {
		const transaction = createEventTransaction(collections, newEventValues);

		// Optimistic: visible before the server has answered.
		expect(collections.events.size).toBe(2);

		await transaction.isPersisted.promise;

		expect(server.createEvent).toHaveBeenCalledOnce();
		const sent = sentTo(server.createEvent);
		expect(sent).toMatchObject({
			...newEventValues,
			outcome: null,
			resolvedAt: null,
			voidedAt: null,
			isProcessed: false,
		});
		expect(sent.id).toEqual(expect.any(String));
	});

	it("takes the new event back off the list when the server rejects it", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		server.createEvent.mockRejectedValue(
			new Error("Both warbands must participate"),
		);

		const transaction = createEventTransaction(collections, newEventValues);
		expect(collections.events.size).toBe(2);

		await expect(transaction.isPersisted.promise).rejects.toThrow();

		expect(collections.events.size).toBe(1);
		expect(stored(existing.id)).toMatchObject(existing);
	});
});

describe("updateEventTransaction", () => {
	it("edits the event's facts and restores them if the edit is refused", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		server.updateEvent.mockRejectedValue(
			new Error("Resolved event facts cannot be edited."),
		);

		const transaction = updateEventTransaction(collections, existing.id, {
			notes: "Corrected",
		});
		expect(stored(existing.id)?.notes).toBe("Corrected");

		await expect(transaction.isPersisted.promise).rejects.toThrow();

		expect(stored(existing.id)?.notes).toBeNull();
	});
});

describe("setEventOutcomeTransaction", () => {
	it("waits for the server before showing an outcome", async () => {
		let confirm: (() => void) | undefined;
		server.resolveEvent.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					confirm = resolve;
				}),
		);

		const transaction = setEventOutcomeTransaction(
			collections,
			existing.id,
			"Injury",
		);

		// Not optimistic on purpose: only one resolution is ever permitted, so the
		// table must not show an outcome the server may still reject.
		expect(stored(existing.id)?.outcome).toBeNull();

		confirm?.();
		await transaction.isPersisted.promise;

		expect(server.resolveEvent).toHaveBeenCalledExactlyOnceWith({
			data: { id: existing.id, outcome: "Injury" },
		});
	});

	it("never shows an outcome the server refuses", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		server.resolveEvent.mockRejectedValue(
			new Error("This warrior is already dead."),
		);

		const transaction = setEventOutcomeTransaction(
			collections,
			existing.id,
			"Death",
		);
		await expect(transaction.isPersisted.promise).rejects.toThrow(
			"This warrior is already dead.",
		);

		expect(stored(existing.id)?.outcome).toBeNull();
		expect(stored(existing.id)?.resolvedAt).toBeNull();
	});
});

describe("voidEventTransaction", () => {
	it("requires a reason before contacting the server", () => {
		for (const reason of ["", "   ", "\n\t"]) {
			expect(() =>
				voidEventTransaction(collections, existing.id, reason),
			).toThrow("A reason is required to void an event.");
		}
		expect(server.voidEvent).not.toHaveBeenCalled();
	});

	it("sends a trimmed reason and keeps the event until the void is confirmed", async () => {
		const transaction = voidEventTransaction(
			collections,
			existing.id,
			"  Duplicate entry  ",
		);

		expect(stored(existing.id)?.voidedAt).toBeNull();

		await transaction.isPersisted.promise;

		expect(server.voidEvent).toHaveBeenCalledExactlyOnceWith({
			data: { id: existing.id, reason: "Duplicate entry" },
		});
	});

	it("leaves the event intact when the void is refused", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		server.voidEvent.mockRejectedValue(new Error("Event is already voided."));

		const transaction = voidEventTransaction(
			collections,
			existing.id,
			"Duplicate",
		);
		await expect(transaction.isPersisted.promise).rejects.toThrow();

		expect(stored(existing.id)).toMatchObject(existing);
	});
});
