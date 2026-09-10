import { eq, or } from "drizzle-orm";
import type { z } from "zod";
import type { Database } from "@/db/index.server";
import { type Clock, systemClock } from "@/db/operations/clock";
import {
	events,
	matches,
	warbandMatches,
	warbands,
	warriors,
} from "@/db/schema";
import type {
	WarbandDeleteInputSchema,
	WarbandSchema,
	WarbandUpdateInputSchema,
} from "@/db/validation/warband";

export function listWarbands(db: Database) {
	return db.select().from(warbands).orderBy(warbands.name);
}

export async function createWarband(
	db: Database,
	data: z.output<typeof WarbandSchema>,
) {
	await db.insert(warbands).values(data);
}

export async function updateWarband(
	db: Database,
	data: z.output<typeof WarbandUpdateInputSchema>,
	clock: Clock = systemClock,
) {
	if (Object.keys(data.changes).length === 0) return;

	await db
		.update(warbands)
		.set({
			...data.changes,
			updatedAt: clock(),
		})
		.where(eq(warbands.id, data.id));
}

export async function deleteWarband(
	db: Database,
	data: z.output<typeof WarbandDeleteInputSchema>,
) {
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
}
