import { z } from "zod";

export const EVENT_OUTCOMES = ["Injury", "Death", "Recovery"] as const;
export const EventOutcomeSchema = z.enum(EVENT_OUTCOMES);

const EventFieldsShape = {
	matchId: z.string().min(1),
	attackerWarbandId: z.string().min(1),
	attackerWarriorId: z.string().min(1),
	defenderWarbandId: z.string().min(1),
	defenderWarriorId: z.string().min(1),
	notes: z.string().trim().nullable(),
	outcome: EventOutcomeSchema.nullable().default(null),
	resolvedAt: z.string().nullable().default(null),
	voidedAt: z.string().nullable().default(null),
	voidReason: z.string().trim().min(1).nullable().default(null),
	// Compatibility only. Lifecycle behavior uses outcome and timestamps.
	isProcessed: z.boolean().default(false),
};

const differentWarbands = {
	message: "Attacker and defender must be different warbands.",
	path: ["defenderWarbandId"],
};

const resolvedEventsHaveOutcomes = {
	message: "An event is resolved if and only if it has an outcome.",
	path: ["outcome"],
};

const voidedEventsHaveReasons = {
	message:
		"A voided event must have a reason, and active events cannot have one.",
	path: ["voidReason"],
};

function hasConsistentResolution(event: {
	outcome: z.output<typeof EventOutcomeSchema> | null;
	resolvedAt: string | null;
}) {
	return (event.resolvedAt !== null) === (event.outcome !== null);
}

function hasConsistentVoid(event: {
	voidedAt: string | null;
	voidReason: string | null;
}) {
	return (event.voidedAt !== null) === (event.voidReason !== null);
}

export const EventFieldsSchema = z
	.object(EventFieldsShape)
	.refine(
		(event) => event.attackerWarbandId !== event.defenderWarbandId,
		differentWarbands,
	)
	.refine(hasConsistentResolution, resolvedEventsHaveOutcomes)
	.refine(hasConsistentVoid, voidedEventsHaveReasons);

export const EventSchema = z
	.object({
		...EventFieldsShape,
		id: z.string().min(1),
		notes: EventFieldsShape.notes.default(null),
		createdAt: z.string().default(() => new Date().toISOString()),
		updatedAt: z.string().default(() => new Date().toISOString()),
	})
	.refine(
		(event) => event.attackerWarbandId !== event.defenderWarbandId,
		differentWarbands,
	)
	.refine(hasConsistentResolution, resolvedEventsHaveOutcomes)
	.refine(hasConsistentVoid, voidedEventsHaveReasons);

export const EventCreateSchema = EventSchema.refine(
	(event) =>
		event.outcome === null &&
		event.resolvedAt === null &&
		event.voidedAt === null &&
		event.voidReason === null,
	{ message: "New events must be unresolved and active." },
);

export const EventFactUpdateSchema = z
	.object({
		matchId: EventFieldsShape.matchId,
		attackerWarbandId: EventFieldsShape.attackerWarbandId,
		attackerWarriorId: EventFieldsShape.attackerWarriorId,
		defenderWarbandId: EventFieldsShape.defenderWarbandId,
		defenderWarriorId: EventFieldsShape.defenderWarriorId,
		notes: EventFieldsShape.notes,
	})
	.partial()
	.strict();

export const EventUpdateSchema = z
	.object({
		matchId: z.string().min(1),
		attackerWarbandId: z.string().min(1),
		attackerWarriorId: z.string().min(1),
		defenderWarbandId: z.string().min(1),
		defenderWarriorId: z.string().min(1),
		notes: z.string().trim().nullable(),
		outcome: EventOutcomeSchema.nullable(),
		resolvedAt: z.string().nullable(),
		voidedAt: z.string().nullable(),
		voidReason: z.string().trim().min(1).nullable(),
		isProcessed: z.boolean(),
	})
	.partial()
	.strict();

export function isEventResolved(
	event: Pick<Event, "outcome" | "resolvedAt">,
): event is Pick<Event, "outcome" | "resolvedAt"> & {
	outcome: EventOutcome;
	resolvedAt: string;
} {
	return event.outcome !== null && event.resolvedAt !== null;
}

export function isEffectiveEvent(
	event: Pick<Event, "outcome" | "resolvedAt" | "voidedAt">,
) {
	return isEventResolved(event) && event.voidedAt === null;
}

export type EventOutcome = z.output<typeof EventOutcomeSchema>;
export type Event = z.output<typeof EventSchema>;
export type EventInput = z.input<typeof EventSchema>;

export function validateEventMembership(
	event: Pick<
		Event,
		| "attackerWarbandId"
		| "attackerWarriorId"
		| "defenderWarbandId"
		| "defenderWarriorId"
	>,
	participantWarbandIds: ReadonlySet<string>,
	warriorWarbandIds: ReadonlyMap<string, string>,
) {
	if (
		!participantWarbandIds.has(event.attackerWarbandId) ||
		!participantWarbandIds.has(event.defenderWarbandId)
	) {
		throw new Error("Both warbands must participate in the selected match.");
	}

	if (
		warriorWarbandIds.get(event.attackerWarriorId) !== event.attackerWarbandId
	) {
		throw new Error(
			"The attacking warrior must belong to the attacking warband.",
		);
	}

	if (
		warriorWarbandIds.get(event.defenderWarriorId) !== event.defenderWarbandId
	) {
		throw new Error(
			"The defending warrior must belong to the defending warband.",
		);
	}
}
