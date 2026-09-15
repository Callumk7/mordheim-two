import { DbClient } from "@tanstack/react-db";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WarriorEquipment } from "@/db/validation/warrior-equipment";
import { getCollections } from "@/db-collections";
import {
	equipWarriorTransaction,
	unequipWarriorTransaction,
} from "../warrior-equipment";

// Only the network boundary is doubled: the collections, their schemas and the
// transaction machinery below are the ones the app runs.
const server = vi.hoisted(() => ({
	listWarriorEquipment: vi.fn(),
	createWarriorEquipment: vi.fn(),
	deleteWarriorEquipment: vi.fn(),
}));

vi.mock("@/server/warrior-equipment", () => server);

const timestamp = "2026-01-01T00:00:00.000Z";

const assignment: WarriorEquipment = {
	id: "assignment-1",
	warriorId: "warrior-1",
	equipmentId: "sword",
	createdAt: timestamp,
	updatedAt: timestamp,
};

let collections: ReturnType<typeof getCollections>;

beforeEach(async () => {
	for (const fn of Object.values(server)) {
		fn.mockReset();
		fn.mockResolvedValue(undefined);
	}
	server.listWarriorEquipment.mockResolvedValue([assignment]);

	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	collections = getCollections(new DbClient({ queryClient }));
	await collections.warriorEquipment.preload();
});

afterEach(() => {
	vi.restoreAllMocks();
});

function assignmentIds() {
	return collections.warriorEquipment.toArray.map((row) => row.id).sort();
}

describe("equipWarriorTransaction", () => {
	it("adds a second copy of an item the warrior already carries", async () => {
		const transaction = equipWarriorTransaction(
			collections,
			assignment.warriorId,
			assignment.equipmentId,
		);

		expect(collections.warriorEquipment.size).toBe(2);

		await transaction.isPersisted.promise;

		const sent = server.createWarriorEquipment.mock.calls[0][0].data;
		expect(sent).toMatchObject({
			warriorId: assignment.warriorId,
			equipmentId: assignment.equipmentId,
		});
		// A distinct assignment, not a replacement: copies are tracked separately.
		expect(sent.id).not.toBe(assignment.id);
	});

	it("removes the item again when the assignment is rejected", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		server.createWarriorEquipment.mockRejectedValue(
			new Error("Equipment no longer exists"),
		);

		const transaction = equipWarriorTransaction(
			collections,
			assignment.warriorId,
			"missing",
		);
		await expect(transaction.isPersisted.promise).rejects.toThrow();

		expect(assignmentIds()).toEqual([assignment.id]);
	});
});

describe("unequipWarriorTransaction", () => {
	it("removes the assignment and sends the deletion", async () => {
		const transaction = unequipWarriorTransaction(collections, assignment.id);

		expect(assignmentIds()).toEqual([]);

		await transaction.isPersisted.promise;

		expect(server.deleteWarriorEquipment).toHaveBeenCalledExactlyOnceWith({
			data: { id: assignment.id },
		});
	});

	it("puts the item back when the deletion fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		server.deleteWarriorEquipment.mockRejectedValue(
			new Error("D1 unavailable"),
		);

		const transaction = unequipWarriorTransaction(collections, assignment.id);
		await expect(transaction.isPersisted.promise).rejects.toThrow();

		expect(collections.warriorEquipment.get(assignment.id)).toMatchObject(
			assignment,
		);
	});
});
