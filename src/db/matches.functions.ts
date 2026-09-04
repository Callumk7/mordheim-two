import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";
import { getDb } from "./index.server";
import { MatchSchema, MatchUpdateSchema } from "./match";
import { events, matches, warbandMatches } from "./schema";
import { WarbandMatchSchema } from "./warband-match";

export const listMatches = createServerFn({ method: "GET" }).handler(() =>
	getDb().select().from(matches).orderBy(matches.createdAt),
);

export const createMatch = createServerFn({ method: "POST" })
	.validator(MatchSchema)
	.handler(async ({ data }) => {
		await getDb().insert(matches).values(data);
	});

export const createMatchWithParticipants = createServerFn({ method: "POST" })
	.validator(
		z.object({
			match: MatchSchema,
			participants: z.array(WarbandMatchSchema),
		}),
	)
	.handler(async ({ data }) => {
		if (
			data.participants.some(
				(participant) => participant.matchId !== data.match.id,
			)
		) {
			throw new Error("Every participant must belong to the created match.");
		}
		const db = getDb();
		const statements: BatchItem<"sqlite">[] = [
			db.insert(matches).values(data.match),
			...data.participants.map((participant) =>
				db.insert(warbandMatches).values(participant),
			),
		];
		await db.batch(
			statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]],
		);
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

export const updateMatchWithParticipants = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.string().min(1),
			changes: MatchUpdateSchema,
			additions: z.array(WarbandMatchSchema),
			removals: z.array(z.string().min(1)),
		}),
	)
	.handler(async ({ data }) => {
		if (data.additions.some((participant) => participant.matchId !== data.id)) {
			throw new Error("Every participant must belong to the updated match.");
		}
		const db = getDb();
		const statements: BatchItem<"sqlite">[] = [
			db
				.update(matches)
				.set({
					...data.changes,
					updatedAt: new Date().toISOString(),
				})
				.where(eq(matches.id, data.id)),
			...data.removals.map((id) =>
				db
					.delete(warbandMatches)
					.where(
						and(eq(warbandMatches.id, id), eq(warbandMatches.matchId, data.id)),
					),
			),
			...data.additions.map((participant) =>
				db.insert(warbandMatches).values(participant),
			),
		];
		await db.batch(
			statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]],
		);
	});

export const deleteMatch = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		const db = getDb();
		await db.batch([
			db.delete(events).where(eq(events.matchId, data.id)),
			db.delete(warbandMatches).where(eq(warbandMatches.matchId, data.id)),
			db.delete(matches).where(eq(matches.id, data.id)),
		]);
	});
