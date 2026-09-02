import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./index.server";
import { warbandMatches, warbands } from "./schema";
import { WarbandSchema, WarbandUpdateSchema } from "./warband";

export const listWarbands = createServerFn({ method: "GET" }).handler(() =>
	getDb().query.warbands.findMany({
		orderBy: (warbands, { asc }) => [asc(warbands.name)],
		with: {
			warriors: true,
			warbandMatches: { with: { match: true } },
			attackingEvents: true,
			defendingEvents: true,
		},
	}),
);

export const createWarband = createServerFn({ method: "POST" })
	.validator(WarbandSchema)
	.handler(async ({ data }) => {
		await getDb().insert(warbands).values(data);
	});

export const updateWarband = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.string().min(1),
			changes: WarbandUpdateSchema,
		}),
	)
	.handler(async ({ data }) => {
		if (Object.keys(data.changes).length === 0) return;

		await getDb()
			.update(warbands)
			.set({
				...data.changes,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(warbands.id, data.id));
	});

export const deleteWarband = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		const db = getDb();
		await db.batch([
			db.delete(warbandMatches).where(eq(warbandMatches.warbandId, data.id)),
			db.delete(warbands).where(eq(warbands.id, data.id)),
		]);
	});
