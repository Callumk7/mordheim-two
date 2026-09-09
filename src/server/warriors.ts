import { createServerFn } from "@tanstack/react-start";
import { eq, or } from "drizzle-orm";
import { getDb } from "@/db/index.server";
import { events, warriors } from "@/db/schema";
import {
	WarriorDeleteInputSchema,
	WarriorSchema,
	WarriorUpdateInputSchema,
} from "@/db/validation/warrior";

export const listWarriors = createServerFn({ method: "GET" }).handler(() =>
	getDb().select().from(warriors).orderBy(warriors.name),
);

export const createWarrior = createServerFn({ method: "POST" })
	.validator(WarriorSchema)
	.handler(async ({ data }) => {
		await getDb().insert(warriors).values(data);
	});

export const updateWarrior = createServerFn({ method: "POST" })
	.validator(WarriorUpdateInputSchema)
	.handler(async ({ data }) => {
		if (Object.keys(data.changes).length === 0) return;

		await getDb()
			.update(warriors)
			.set({
				...data.changes,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(warriors.id, data.id));
	});

export const deleteWarrior = createServerFn({ method: "POST" })
	.validator(WarriorDeleteInputSchema)
	.handler(async ({ data }) => {
		const db = getDb();
		const referenced = await db
			.select({ id: events.id })
			.from(events)
			.where(
				or(
					eq(events.attackerWarriorId, data.id),
					eq(events.defenderWarriorId, data.id),
				),
			)
			.limit(1);
		if (referenced.length > 0) {
			throw new Error(
				"This warrior is part of event history and cannot be deleted.",
			);
		}
		await db.delete(warriors).where(eq(warriors.id, data.id));
	});
