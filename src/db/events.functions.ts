import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
	type Event,
	EventFieldsSchema,
	EventSchema,
	EventUpdateSchema,
	validateEventMembership,
} from "./event";
import { type Database, getDb } from "./index.server";
import { events, warbandMatches, warriors } from "./schema";

export const listEvents = createServerFn({ method: "GET" }).handler(() =>
	getDb().select().from(events).orderBy(events.createdAt),
);

async function assertEventMembership(
	db: Database,
	event: Pick<
		Event,
		| "matchId"
		| "attackerWarbandId"
		| "attackerWarriorId"
		| "defenderWarbandId"
		| "defenderWarriorId"
	>,
) {
	const warbandIds = [event.attackerWarbandId, event.defenderWarbandId];
	const warriorIds = [event.attackerWarriorId, event.defenderWarriorId];
	const [participantRows, warriorRows] = await Promise.all([
		db
			.select({ warbandId: warbandMatches.warbandId })
			.from(warbandMatches)
			.where(
				and(
					eq(warbandMatches.matchId, event.matchId),
					inArray(warbandMatches.warbandId, warbandIds),
				),
			),
		db
			.select({ id: warriors.id, warbandId: warriors.warbandId })
			.from(warriors)
			.where(inArray(warriors.id, warriorIds)),
	]);

	validateEventMembership(
		event,
		new Set(participantRows.map((row) => row.warbandId)),
		new Map(warriorRows.map((row) => [row.id, row.warbandId])),
	);
}

export const createEvent = createServerFn({ method: "POST" })
	.validator(EventSchema)
	.handler(async ({ data }) => {
		const db = getDb();
		await assertEventMembership(db, data);
		await db.insert(events).values(data);
	});

export const updateEvent = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.string().min(1),
			changes: EventUpdateSchema,
		}),
	)
	.handler(async ({ data }) => {
		if (Object.keys(data.changes).length === 0) return;

		const db = getDb();
		const [currentEvent] = await db
			.select()
			.from(events)
			.where(eq(events.id, data.id))
			.limit(1);
		if (!currentEvent) return;

		const nextEvent = EventFieldsSchema.parse({
			matchId: currentEvent.matchId,
			attackerWarbandId: currentEvent.attackerWarbandId,
			attackerWarriorId: currentEvent.attackerWarriorId,
			defenderWarbandId: currentEvent.defenderWarbandId,
			defenderWarriorId: currentEvent.defenderWarriorId,
			notes: currentEvent.notes,
			...data.changes,
		});
		await assertEventMembership(db, nextEvent);

		await db
			.update(events)
			.set({
				...data.changes,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(events.id, data.id));
	});

export const deleteEvent = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		await getDb().delete(events).where(eq(events.id, data.id));
	});
