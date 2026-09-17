import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as operations from "@/db/operations/skills.server";
import { createWarband } from "@/db/operations/warbands.server";
import {
	createWarriorSkill,
	listWarriorSkills,
} from "@/db/operations/warrior-skills.server";
import { createWarrior, listWarriors } from "@/db/operations/warriors.server";
import {
	clock,
	skill,
	skillAssignment,
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

describe("skill operations on local D1", () => {
	it("creates, alphabetizes, updates, and uniquely names skills", async () => {
		const { db } = connection;
		await operations.createSkill(db, skill("Strongman"));
		await operations.createSkill(db, skill("Acrobat"));
		expect((await operations.listSkills(db)).map((row) => row.name)).toEqual([
			"Acrobat",
			"Strongman",
		]);
		await operations.updateSkill(
			db,
			{ id: "Strongman", changes: { description: "Updated rules." } },
			clock,
		);
		expect(await operations.listSkills(db)).toContainEqual({
			...skill("Strongman"),
			description: "Updated rules.",
			updatedAt,
		});
		await expect(
			operations.createSkill(db, {
				...skill("duplicate"),
				name: "Strongman",
			}),
		).rejects.toThrow();
	});

	it("cascades assignments when a skill is deleted, not the warrior", async () => {
		const { db } = connection;
		await createWarband(db, warband());
		await createWarrior(db, warrior());
		await operations.createSkill(db, skill());
		await createWarriorSkill(db, skillAssignment());
		await operations.deleteSkill(db, { id: "strongman" });
		expect(await listWarriorSkills(db)).toEqual([]);
		expect(await listWarriors(db)).toEqual([warrior()]);
	});
});
