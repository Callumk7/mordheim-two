import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as operations from "@/db/operations/equipment.server";
import { createWarband } from "@/db/operations/warbands.server";
import {
	createWarriorEquipment,
	listWarriorEquipment,
} from "@/db/operations/warrior-equipment.server";
import { createWarrior, listWarriors } from "@/db/operations/warriors.server";
import {
	assignment,
	clock,
	equipment,
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

describe("equipment operations on local D1", () => {
	it("round-trips text costs, nullable fields, JSON rules and alphabetical listing", async () => {
		const { db } = connection;
		await operations.createEquipment(db, equipment());
		await operations.createEquipment(db, {
			...equipment("axe"),
			cost: "D6 x 10 gc",
			specialRules: [],
		});
		await operations.updateEquipment(db, { id: "sword", changes: {} }, clock);
		expect(await operations.listEquipment(db)).toEqual([
			{ ...equipment("axe"), cost: "D6 x 10 gc", specialRules: [] },
			equipment(),
		]);
		await operations.updateEquipment(
			db,
			{ id: "sword", changes: { cost: null, specialRules: ["Parry", "Rare"] } },
			clock,
		);
		expect(await operations.listEquipment(db)).toContainEqual({
			...equipment(),
			cost: null,
			specialRules: ["Parry", "Rare"],
			updatedAt,
		});
	});

	it("deletes assignments by cascade without deleting their warrior", async () => {
		const { db } = connection;
		await createWarband(db, warband());
		await createWarrior(db, warrior());
		await operations.createEquipment(db, equipment());
		await createWarriorEquipment(db, assignment());
		await operations.deleteEquipment(db, { id: "sword" });
		expect(await operations.listEquipment(db)).toEqual([]);
		expect(await listWarriorEquipment(db)).toEqual([]);
		expect(await listWarriors(db)).toEqual([warrior()]);
	});
});
