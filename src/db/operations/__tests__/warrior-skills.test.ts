import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSkill } from "@/db/operations/skills.server";
import { createWarband } from "@/db/operations/warbands.server";
import * as operations from "@/db/operations/warrior-skills.server";
import { createWarrior } from "@/db/operations/warriors.server";
import { skill, skillAssignment, warband, warrior } from "./fixtures";
import { createTestDatabase } from "./test-database";

let connection: Awaited<ReturnType<typeof createTestDatabase>>;
beforeEach(async () => {
	connection = await createTestDatabase();
}, 30_000);
afterEach(async () => {
	await connection?.dispose();
});

describe("warrior skill operations on local D1", () => {
	it("assigns once, lists, and removes a skill", async () => {
		const { db } = connection;
		await createWarband(db, warband());
		await createWarrior(db, warrior());
		await createSkill(db, skill());
		await operations.createWarriorSkill(db, skillAssignment());
		expect(await operations.listWarriorSkills(db)).toEqual([skillAssignment()]);
		await expect(
			operations.createWarriorSkill(db, skillAssignment("duplicate")),
		).rejects.toThrow();
		await operations.deleteWarriorSkill(db, { id: "skill-assignment" });
		expect(await operations.listWarriorSkills(db)).toEqual([]);
	});

	it("rejects missing warriors and skills", async () => {
		const { db } = connection;
		await expect(
			operations.createWarriorSkill(db, skillAssignment()),
		).rejects.toThrow();
	});
});
