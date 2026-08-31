import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { EventFieldsSchema, EventSchema, EventUpdateSchema } from "./event";
import { getDb } from "./index.server";
import { events } from "./schema";

export const listEvents = createServerFn({ method: "GET" }).handler(async () =>
	getDb().select().from(events).orderBy(events.createdAt),
);

export const createEvent = createServerFn({ method: "POST" })
	.validator(EventSchema)
	.handler(async ({ data }) => {
		await getDb().insert(events).values(data);
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

		EventFieldsSchema.parse({
			matchId: currentEvent.matchId,
			attackerWarbandId: currentEvent.attackerWarbandId,
			defenderWarbandId: currentEvent.defenderWarbandId,
			notes: currentEvent.notes,
			...data.changes,
		});

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
