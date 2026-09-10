import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEvent } from "@/db/operations/events.server";
import { createMatch } from "@/db/operations/matches.server";
import * as operations from "@/db/operations/warband-matches.server";
import { event, match, participant, seedMatch } from "./fixtures";
import { createTestDatabase } from "./test-database";

let connection: Awaited<ReturnType<typeof createTestDatabase>>;
beforeEach(async () => {
	connection = await createTestDatabase();
}, 30_000);
afterEach(async () => {
	await connection?.dispose();
});

describe("warband match operations on local D1", () => {
	it("creates, lists, deletes and enforces unique match membership", async () => {
		const { db } = connection;
		await seedMatch(db);
		await operations.createWarbandMatch(db, participant("c"));
		expect(await operations.listWarbandMatches(db)).toContainEqual(
			participant("c"),
		);
		await expect(
			operations.createWarbandMatch(db, {
				...participant("c"),
				id: "duplicate",
			}),
		).rejects.toThrow();
		await operations.deleteWarbandMatch(db, { id: "match-c" });
		expect(await operations.listWarbandMatches(db)).toHaveLength(2);
	});

	it("enforces parent foreign keys and event membership references", async () => {
		const { db } = connection;
		await createMatch(db, match("empty"));
		await expect(
			operations.createWarbandMatch(db, participant("missing", "empty")),
		).rejects.toThrow();
		await seedMatch(db);
		await expect(
			operations.createWarbandMatch(db, participant("a", "missing")),
		).rejects.toThrow();
		await createEvent(db, event());
		await expect(
			operations.deleteWarbandMatch(db, { id: "match-a" }),
		).rejects.toThrow();
		expect(await operations.listWarbandMatches(db)).toHaveLength(2);
	});
});
