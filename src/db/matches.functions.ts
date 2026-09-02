import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./index.server";
import { MatchSchema, MatchUpdateSchema } from "./match";
import { matches, warbandMatches } from "./schema";

export const listMatches = createServerFn({ method: "GET" }).handler(() =>
	getDb().query.matches.findMany({
		orderBy: (matches, { asc }) => [asc(matches.createdAt)],
		with: {
			warbandMatches: { with: { warband: true } },
			events: true,
		},
	}),
);

export const createMatch = createServerFn({ method: "POST" })
	.validator(MatchSchema)
	.handler(async ({ data }) => {
		await getDb().insert(matches).values(data);
	});

export const updateMatch = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.string().min(1),
			changes: MatchUpdateSchema,
		}),
	)
	.handler(async ({ data }) => {
		if (Object.keys(data.changes).length === 0) return;

		await getDb()
			.update(matches)
			.set({
				...data.changes,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(matches.id, data.id));
	});

export const deleteMatch = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		const db = getDb();
		await db.batch([
			db.delete(warbandMatches).where(eq(warbandMatches.matchId, data.id)),
			db.delete(matches).where(eq(matches.id, data.id)),
		]);
	});
