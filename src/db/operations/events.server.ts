import { and, eq, inArray, isNull } from "drizzle-orm";
import type { z } from "zod";
import type { Database } from "@/db/index.server";
import { type Clock, systemClock } from "@/db/operations/clock";
import { events, warbandMatches, warriors } from "@/db/schema";
import {
	type Event,
	type EventCreateSchema,
	type EventFactUpdateInputSchema,
	EventFieldsSchema,
	type EventResolutionInputSchema,
	type EventVoidInputSchema,
	validateEventMembership,
} from "@/db/validation/event";

export function listEvents(db: Database) {
	return db.select().from(events).orderBy(events.createdAt);
}

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

export async function createEvent(
	db: Database,
	data: z.output<typeof EventCreateSchema>,
) {
	await assertEventMembership(db, data);
	await db.insert(events).values({
		...data,
		outcome: null,
		resolvedAt: null,
		voidedAt: null,
		voidReason: null,
		isProcessed: false,
	});
}

export async function updateEvent(
	db: Database,
	data: z.output<typeof EventFactUpdateInputSchema>,
	clock: Clock = systemClock,
) {
	if (Object.keys(data.changes).length === 0) return;
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
		.set({ ...data.changes, updatedAt: clock() })
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
}

export async function resolveEvent(
	db: Database,
	data: z.output<typeof EventResolutionInputSchema>,
	clock: Clock = systemClock,
) {
	const now = clock();
	const updated = await db
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
}

export async function voidEvent(
	db: Database,
	data: z.output<typeof EventVoidInputSchema>,
	clock: Clock = systemClock,
) {
	const now = clock();
	const updated = await db
		.update(events)
		.set({ voidedAt: now, voidReason: data.reason, updatedAt: now })
		.where(and(eq(events.id, data.id), isNull(events.voidedAt)))
		.returning({ id: events.id });
	if (updated.length === 0) throw new Error("This event is already voided.");
}
