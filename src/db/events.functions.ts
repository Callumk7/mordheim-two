import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import {
	type Event,
	EventCreateSchema,
	EventFactUpdateSchema,
	EventFieldsSchema,
	EventOutcomeSchema,
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
	.validator(EventCreateSchema)
	.handler(async ({ data }) => {
		const db = getDb();
		await assertEventMembership(db, data);
		await db.insert(events).values({
			...data,
			outcome: null,
			resolvedAt: null,
			voidedAt: null,
			voidReason: null,
			isProcessed: false,
		});
	});

export const updateEvent = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.string().min(1),
			changes: EventFactUpdateSchema,
		}),
	)
	.handler(async ({ data }) => {
		if (Object.keys(data.changes).length === 0) return;
		const db = getDb();
		const [current] = await db
			.select()
			.from(events)
			.where(eq(events.id, data.id))
			.limit(1);
		if (!current) throw new Error("Event not found.");
		if (
			current.outcome !== null ||
			current.resolvedAt !== null ||
			current.voidedAt !== null
		) {
			throw new Error("Resolved or voided event facts cannot be edited.");
		}

		const next = EventFieldsSchema.parse({ ...current, ...data.changes });
		await assertEventMembership(db, next);
		const updated = await db
			.update(events)
			.set({ ...data.changes, updatedAt: new Date().toISOString() })
			.where(
				and(
					eq(events.id, data.id),
					isNull(events.outcome),
					isNull(events.resolvedAt),
					isNull(events.voidedAt),
				),
			)
			.returning({ id: events.id });
		if (updated.length === 0) {
			throw new Error("This event was resolved or voided by another update.");
		}
	});

export const resolveEvent = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string().min(1), outcome: EventOutcomeSchema }))
	.handler(async ({ data }) => {
		const now = new Date().toISOString();
		const updated = await getDb()
			.update(events)
			.set({
				outcome: data.outcome,
				resolvedAt: now,
				isProcessed: true,
				updatedAt: now,
			})
			.where(
				and(
					eq(events.id, data.id),
					isNull(events.outcome),
					isNull(events.resolvedAt),
					isNull(events.voidedAt),
				),
			)
			.returning({ id: events.id });
		if (updated.length === 0) {
			throw new Error("This event has already been resolved or voided.");
		}
	});

export const voidEvent = createServerFn({ method: "POST" })
	.validator(
		z.object({ id: z.string().min(1), reason: z.string().trim().min(1) }),
	)
	.handler(async ({ data }) => {
		const now = new Date().toISOString();
		const updated = await getDb()
			.update(events)
			.set({ voidedAt: now, voidReason: data.reason, updatedAt: now })
			.where(and(eq(events.id, data.id), isNull(events.voidedAt)))
			.returning({ id: events.id });
		if (updated.length === 0) throw new Error("This event is already voided.");
	});
