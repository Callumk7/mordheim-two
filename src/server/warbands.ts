import { createServerFn } from "@tanstack/react-start";
import { eq, or } from "drizzle-orm";
import { getDb } from "@/db/index.server";
import {
	events,
	matches,
	warbandMatches,
	warbands,
	warriors,
} from "@/db/schema";
import {
	WarbandDeleteInputSchema,
	WarbandSchema,
	WarbandUpdateInputSchema,
} from "@/db/validation/warband";

export const listWarbands = createServerFn({ method: "GET" }).handler(() =>
	getDb().select().from(warbands).orderBy(warbands.name),
);

export const createWarband = createServerFn({ method: "POST" })
	.validator(WarbandSchema)
	.handler(async ({ data }) => {
		await getDb().insert(warbands).values(data);
	});

export const updateWarband = createServerFn({ method: "POST" })
	.validator(WarbandUpdateInputSchema)
	.handler(async ({ data }) => {
		if (Object.keys(data.changes).length === 0) return;

		await getDb()
			.update(warbands)
			.set({
				...data.changes,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(warbands.id, data.id));
	});

export const deleteWarband = createServerFn({ method: "POST" })
	.validator(WarbandDeleteInputSchema)
	.handler(async ({ data }) => {
		const db = getDb();
		const referenced = await db
			.select({ id: events.id })
			.from(events)
			.where(
				or(
					eq(events.attackerWarbandId, data.id),
					eq(events.defenderWarbandId, data.id),
				),
			)
			.limit(1);
		if (referenced.length > 0) {
			throw new Error(
				"This warband is part of event history and cannot be deleted.",
			);
		}
		const winningMatch = await db
			.select({ id: matches.id })
			.from(matches)
			.where(eq(matches.winnerWarbandId, data.id))
			.limit(1);
		if (winningMatch.length > 0) {
			throw new Error(
				"This warband has a recorded match victory and cannot be deleted.",
			);
		}
		await db.batch([
			db.delete(warbandMatches).where(eq(warbandMatches.warbandId, data.id)),
			db.delete(warriors).where(eq(warriors.warbandId, data.id)),
			db.delete(warbands).where(eq(warbands.id, data.id)),
		]);
	});
