import { and, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
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

export async function listEvents(db: Database) {
	const rows = await db.select().from(events).orderBy(events.createdAt);
	return rows.map(({ activeImageJobId: _activeImageJobId, ...event }) => event);
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

export const ALREADY_DEAD_MESSAGE =
	"This warrior is already dead. Record an injury, or void the earlier death first.";

/**
 * `events_effective_death_defender_unique` (migration 0009) allows a warrior at
 * most one effective death. Without this check D1 rejects the resolution with a
 * raw constraint failure, which reaches the user as an unreadable SQL dump.
 */
async function hasEffectiveDeath(
	db: Database,
	defenderWarriorId: string,
	excludingEventId: string,
) {
	const existing = await db
		.select({ id: events.id })
		.from(events)
		.where(
			and(
				eq(events.defenderWarriorId, defenderWarriorId),
				eq(events.outcome, "Death"),
				isNotNull(events.resolvedAt),
				isNull(events.voidedAt),
				ne(events.id, excludingEventId),
			),
		)
		.get();
	return existing !== undefined;
}

function isEffectiveDeathConflict(cause: unknown) {
	const message = cause instanceof Error ? cause.message : String(cause);
	return message.includes("events_effective_death_defender_unique");
}

export async function resolveEvent(
	db: Database,
	data: z.output<typeof EventResolutionInputSchema>,
	clock: Clock = systemClock,
) {
	const now = clock();
	if (data.outcome === "Death") {
		const event = await db
			.select({ defenderWarriorId: events.defenderWarriorId })
			.from(events)
			.where(eq(events.id, data.id))
			.get();
		// A missing event falls through to the update below, so it keeps reporting
		// the same thing it does for every other outcome.
		if (
			event &&
			(await hasEffectiveDeath(db, event.defenderWarriorId, data.id))
		) {
			throw new Error(ALREADY_DEAD_MESSAGE);
		}
	}

	let updated: { id: string }[];
	try {
		updated = await db
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
	} catch (cause) {
		// A concurrent death can still land between the check above and this write.
		if (isEffectiveDeathConflict(cause)) throw new Error(ALREADY_DEAD_MESSAGE);
		throw cause;
	}
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
