import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as operations from "@/db/operations/events.server";
import { events } from "@/db/schema";
import { clock, event, seedMatch, updatedAt } from "./fixtures";
import { createTestDatabase } from "./test-database";

let connection: Awaited<ReturnType<typeof createTestDatabase>>;
beforeEach(async () => {
	connection = await createTestDatabase();
	await seedMatch(connection.db);
}, 30_000);
afterEach(async () => {
	await connection?.dispose();
});

describe("event operations on local D1", () => {
	it("creates, lists and edits facts with an injected clock, preserving empty updates", async () => {
		const { db } = connection;
		await operations.createEvent(db, event());
		await operations.updateEvent(db, { id: "event", changes: {} }, clock);
		expect(await operations.listEvents(db)).toEqual([event()]);
		await operations.updateEvent(
			db,
			{ id: "event", changes: { notes: "An ambush" } },
			clock,
		);
		expect(await operations.listEvents(db)).toEqual([
			{ ...event(), notes: "An ambush", updatedAt },
		]);
	});

	it.each([
		[
			{ attackerWarbandId: "c", attackerWarriorId: "wc" },
			"Both warbands must participate",
		],
		[
			{ defenderWarbandId: "c", defenderWarriorId: "wc" },
			"Both warbands must participate",
		],
		[{ matchId: "missing" }, "Both warbands must participate"],
		[{ attackerWarriorId: "wb" }, "attacking warrior must belong"],
		[{ defenderWarriorId: "wa" }, "defending warrior must belong"],
		[{ attackerWarriorId: "missing" }, "attacking warrior must belong"],
		[{ defenderWarriorId: "missing" }, "defending warrior must belong"],
	])("rejects invalid membership %j on both create and update", async (changes, message) => {
		const { db } = connection;
		await expect(
			operations.createEvent(db, { ...event(), ...changes }),
		).rejects.toThrow(message);
		expect(await operations.listEvents(db)).toEqual([]);
		await operations.createEvent(db, event());
		await expect(
			operations.updateEvent(db, { id: "event", changes }, clock),
		).rejects.toThrow(message);
		expect(await operations.listEvents(db)).toEqual([event()]);
	});

	it("enforces composite membership foreign keys in D1 itself", async () => {
		const { db } = connection;
		await expect(
			db.insert(events).values({ ...event(), attackerWarriorId: "wb" }),
		).rejects.toThrow();
		await expect(
			db.insert(events).values({
				...event(),
				defenderWarbandId: "c",
				defenderWarriorId: "wc",
			}),
		).rejects.toThrow();
		expect(await operations.listEvents(db)).toEqual([]);
	});

	it("resolves once, forbids fact editing, then voids without losing the outcome", async () => {
		const { db } = connection;
		await operations.createEvent(db, event());
		await operations.resolveEvent(
			db,
			{ id: "event", outcome: "Injury" },
			clock,
		);
		await expect(
			operations.resolveEvent(db, { id: "event", outcome: "Death" }, clock),
		).rejects.toThrow("already been resolved or voided");
		await expect(
			operations.updateEvent(
				db,
				{ id: "event", changes: { notes: "Edit" } },
				clock,
			),
		).rejects.toThrow("facts cannot be edited");
		const voidedAt = "2026-09-11T12:00:00.000Z";
		await operations.voidEvent(
			db,
			{ id: "event", reason: "Incorrect entry" },
			() => voidedAt,
		);
		expect(await operations.listEvents(db)).toEqual([
			{
				...event(),
				outcome: "Injury",
				isProcessed: true,
				resolvedAt: updatedAt,
				voidedAt,
				voidReason: "Incorrect entry",
				updatedAt: voidedAt,
			},
		]);
		await expect(
			operations.voidEvent(db, { id: "event", reason: "Again" }, clock),
		).rejects.toThrow("already voided");
	});

	it("forbids editing or resolving an unresolved voided event", async () => {
		const { db } = connection;
		await operations.createEvent(db, event());
		await operations.voidEvent(db, { id: "event", reason: "Duplicate" }, clock);
		await expect(
			operations.resolveEvent(db, { id: "event", outcome: "Death" }, clock),
		).rejects.toThrow("already been resolved or voided");
		await expect(
			operations.updateEvent(
				db,
				{ id: "event", changes: { notes: "Edit" } },
				clock,
			),
		).rejects.toThrow("facts cannot be edited");
		expect(await operations.listEvents(db)).toEqual([
			{ ...event(), voidedAt: updatedAt, voidReason: "Duplicate", updatedAt },
		]);
	});

	it("permits only one competing resolution", async () => {
		const { db } = connection;
		await operations.createEvent(db, event());
		const results = await Promise.allSettled([
			operations.resolveEvent(db, { id: "event", outcome: "Injury" }, clock),
			operations.resolveEvent(db, { id: "event", outcome: "Recovery" }, clock),
		]);
		expect(
			results.filter((result) => result.status === "fulfilled"),
		).toHaveLength(1);
		expect(
			results.filter((result) => result.status === "rejected"),
		).toHaveLength(1);
		const [saved] = await operations.listEvents(db);
		expect(["Injury", "Recovery"]).toContain(saved.outcome);
		expect(saved.resolvedAt).toBe(updatedAt);
	});

	it("enforces one effective death and allows another only after voiding", async () => {
		const { db } = connection;
		await operations.createEvent(db, event());
		await operations.createEvent(db, event("second"));
		await operations.resolveEvent(db, { id: "event", outcome: "Death" }, clock);
		await expect(
			operations.resolveEvent(db, { id: "second", outcome: "Death" }, clock),
		).rejects.toThrow();
		expect(await operations.listEvents(db)).toContainEqual(event("second"));
		await operations.voidEvent(db, { id: "event", reason: "Corrected" }, clock);
		await operations.resolveEvent(
			db,
			{ id: "second", outcome: "Death" },
			clock,
		);
		expect(await operations.listEvents(db)).toContainEqual({
			...event("second"),
			outcome: "Death",
			resolvedAt: updatedAt,
			isProcessed: true,
			updatedAt,
		});
	});

	it("preserves errors for missing events", async () => {
		const { db } = connection;
		await expect(
			operations.updateEvent(
				db,
				{ id: "missing", changes: { notes: "Edit" } },
				clock,
			),
		).rejects.toThrow("Event not found.");
		await expect(
			operations.resolveEvent(db, { id: "missing", outcome: "Death" }, clock),
		).rejects.toThrow("already been resolved or voided");
		await expect(
			operations.voidEvent(db, { id: "missing", reason: "Duplicate" }, clock),
		).rejects.toThrow("already voided");
	});
});
