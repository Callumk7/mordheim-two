import { z } from "zod";

const EventFieldsShape = {
	matchId: z.string().min(1),
	attackerWarbandId: z.string().min(1),
	defenderWarbandId: z.string().min(1),
	notes: z.string().trim().nullable(),
};

const differentWarbands = {
	message: "Attacker and defender must be different warbands.",
	path: ["defenderWarbandId"],
};

export const EventFieldsSchema = z
	.object(EventFieldsShape)
	.refine(
		(event) => event.attackerWarbandId !== event.defenderWarbandId,
		differentWarbands,
	);

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
	);

export const EventUpdateSchema = z.object(EventFieldsShape).partial().strict();

export type Event = z.output<typeof EventSchema>;
