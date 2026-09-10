import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEquipment } from "@/db/operations/equipment.server";
import { createWarband } from "@/db/operations/warbands.server";
import * as operations from "@/db/operations/warrior-equipment.server";
import { createWarrior } from "@/db/operations/warriors.server";
import { assignment, equipment, warband, warrior } from "./fixtures";
import { createTestDatabase } from "./test-database";

let connection: Awaited<ReturnType<typeof createTestDatabase>>;
beforeEach(async () => {
	connection = await createTestDatabase();
}, 30_000);
afterEach(async () => {
	await connection?.dispose();
});

describe("warrior equipment operations on local D1", () => {
	it("creates, lists, deletes, and permits multiple copies of equipment", async () => {
		const { db } = connection;
		await createWarband(db, warband());
		await createWarrior(db, warrior());
		await createEquipment(db, equipment());
		await operations.createWarriorEquipment(db, assignment());
		await operations.createWarriorEquipment(db, assignment("second"));
		expect(await operations.listWarriorEquipment(db)).toEqual([
			assignment(),
			assignment("second"),
		]);
		await operations.deleteWarriorEquipment(db, { id: "assignment" });
		expect(await operations.listWarriorEquipment(db)).toEqual([
			assignment("second"),
		]);
	});

	it("rejects missing warriors and equipment", async () => {
		const { db } = connection;
		await createWarband(db, warband());
		await createWarrior(db, warrior());
		await expect(
			operations.createWarriorEquipment(db, assignment()),
		).rejects.toThrow();
		await createEquipment(db, equipment());
		await expect(
			operations.createWarriorEquipment(db, assignment("bad", "missing")),
		).rejects.toThrow();
		expect(await operations.listWarriorEquipment(db)).toEqual([]);
	});
});
