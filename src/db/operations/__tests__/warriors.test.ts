import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEquipment } from "@/db/operations/equipment.server";
import { createEvent } from "@/db/operations/events.server";
import { createWarband } from "@/db/operations/warbands.server";
import {
	createWarriorEquipment,
	listWarriorEquipment,
} from "@/db/operations/warrior-equipment.server";
import * as operations from "@/db/operations/warriors.server";
import {
	assignment,
	clock,
	equipment,
	event,
	seedMatch,
	updatedAt,
	warband,
	warrior,
} from "./fixtures";
import { createTestDatabase } from "./test-database";

let connection: Awaited<ReturnType<typeof createTestDatabase>>;
beforeEach(async () => {
	connection = await createTestDatabase();
}, 30_000);
afterEach(async () => {
	await connection?.dispose();
});

describe("warrior operations on local D1", () => {
	it("persists CRUD, alphabetical listing, empty changes and a fixed update timestamp", async () => {
		const { db } = connection;
		await createWarband(db, warband());
		await operations.createWarrior(db, warrior("wz"));
		await operations.createWarrior(db, warrior());
		await operations.updateWarrior(db, { id: "wa", changes: {} }, clock);
		expect(await operations.listWarriors(db)).toEqual([
			warrior(),
			warrior("wz"),
		]);
		await operations.updateWarrior(
			db,
			{ id: "wa", changes: { description: "Green hood", experience: 8 } },
			clock,
		);
		expect(await operations.listWarriors(db)).toContainEqual({
			...warrior(),
			description: "Green hood",
			experience: 8,
			updatedAt,
		});
		await createEquipment(db, equipment());
		await createWarriorEquipment(db, assignment());
		await operations.deleteWarrior(db, { id: "wa" });
		expect(await operations.listWarriors(db)).toEqual([warrior("wz")]);
		expect(await listWarriorEquipment(db)).toEqual([]);
	});

	it("archives and unarchives without changing the warband", async () => {
		const { db } = connection;
		await createWarband(db, warband());
		await operations.createWarrior(db, warrior());
		await operations.archiveWarrior(db, { id: "wa" }, clock);
		expect(await operations.listWarriors(db)).toContainEqual({
			...warrior(),
			isArchived: true,
			archivedAt: updatedAt,
			updatedAt,
		});
		expect((await operations.listWarriors(db))[0].warbandId).toBe("a");
		await operations.unarchiveWarrior(db, { id: "wa" }, clock);
		expect(await operations.listWarriors(db)).toContainEqual({
			...warrior(),
			updatedAt,
		});
	});

	it("protects both attacking and defending warriors from history deletion", async () => {
		const { db } = connection;
		await seedMatch(db);
		await createEvent(db, event());
		for (const id of ["wa", "wb"])
			await expect(operations.deleteWarrior(db, { id })).rejects.toThrow(
				"event history",
			);
		expect(await operations.listWarriors(db)).toHaveLength(3);
	});
});
