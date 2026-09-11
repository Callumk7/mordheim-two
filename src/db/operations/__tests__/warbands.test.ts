import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	createEquipment,
	listEquipment,
} from "@/db/operations/equipment.server";
import { createEvent } from "@/db/operations/events.server";
import { updateMatch } from "@/db/operations/matches.server";
import { listWarbandMatches } from "@/db/operations/warband-matches.server";
import * as operations from "@/db/operations/warbands.server";
import {
	createWarriorEquipment,
	listWarriorEquipment,
} from "@/db/operations/warrior-equipment.server";
import { createWarrior, listWarriors } from "@/db/operations/warriors.server";
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

describe("warband operations on local D1", () => {
	it("persists CRUD, alphabetical listing, empty updates, and an injected timestamp", async () => {
		const { db } = connection;
		await operations.createWarband(db, warband("b"));
		await operations.createWarband(db, warband());
		await operations.updateWarband(db, { id: "a", changes: {} }, clock);
		expect(await operations.listWarbands(db)).toEqual([
			warband(),
			warband("b"),
		]);
		await operations.updateWarband(
			db,
			{ id: "a", changes: { bio: "Veteran treasure hunters", gold: 42 } },
			clock,
		);
		expect(await operations.listWarbands(db)).toContainEqual({
			...warband(),
			bio: "Veteran treasure hunters",
			gold: 42,
			updatedAt,
		});
		await operations.deleteWarband(db, { id: "a" });
		expect(await operations.listWarbands(db)).toEqual([warband("b")]);
	});

	it("deletes warriors, assignments and participation but keeps equipment", async () => {
		const { db } = connection;
		await seedMatch(db);
		await createEquipment(db, equipment());
		await createWarriorEquipment(db, assignment());
		await operations.deleteWarband(db, { id: "a" });
		expect((await listWarriors(db)).map((row) => row.id)).toEqual(["wb", "wc"]);
		expect(await listWarriorEquipment(db)).toEqual([]);
		expect((await listWarbandMatches(db)).map((row) => row.warbandId)).toEqual([
			"b",
		]);
		expect(await listEquipment(db)).toEqual([equipment()]);
	});

	it("preserves history and victory deletion guards", async () => {
		const { db } = connection;
		await seedMatch(db);
		await updateMatch(
			db,
			{ id: "match", changes: { result: "Victory", winnerWarbandId: "a" } },
			clock,
		);
		await expect(operations.deleteWarband(db, { id: "a" })).rejects.toThrow(
			"recorded match victory",
		);
		await createEvent(db, event());
		for (const id of ["a", "b"])
			await expect(operations.deleteWarband(db, { id })).rejects.toThrow(
				"event history",
			);
		expect(await operations.listWarbands(db)).toHaveLength(3);
		expect(await listWarriors(db)).toHaveLength(3);
		expect(await listWarbandMatches(db)).toHaveLength(2);
	});

	it("rolls back an earlier participant deletion if a later warrior deletion fails", async () => {
		const { db, binding } = connection;
		await seedMatch(db);
		// Failure injection after the first statement, without changing production operations.
		await binding
			.prepare(
				"CREATE TRIGGER reject_warrior_delete BEFORE DELETE ON warriors BEGIN SELECT RAISE(ABORT, 'test deletion failure'); END",
			)
			.run();
		await expect(operations.deleteWarband(db, { id: "a" })).rejects.toThrow();
		expect((await listWarbandMatches(db)).map((row) => row.id).sort()).toEqual([
			"match-a",
			"match-b",
		]);
		expect(await operations.listWarbands(db)).toContainEqual(warband());
		expect(await listWarriors(db)).toContainEqual(warrior());
	});

	it("enforces the warrior parent foreign key", async () => {
		await expect(createWarrior(connection.db, warrior())).rejects.toThrow();
		expect(await listWarriors(connection.db)).toEqual([]);
	});
});
