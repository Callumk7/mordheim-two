import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import z from "zod";
import { getDb } from "./index.server";
import { warriors } from "./schema";
import { WarriorSchema, WarriorUpdateSchema } from "./warrior";

export const listWarriors = createServerFn({ method: "GET" }).handler(
	async () => getDb().select().from(warriors).orderBy(warriors.name),
);

export const createWarrior = createServerFn({ method: "POST" })
	.validator(WarriorSchema)
	.handler(async ({ data }) => {
		await getDb().insert(warriors).values(data);
	});

export const updateWarrior = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.string().min(1),
			changes: WarriorUpdateSchema,
		}),
	)
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
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		const db = getDb();
		await db.batch([db.delete(warriors).where(eq(warriors.id, data.id))]);
	});
