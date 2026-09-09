import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getDb } from "@/db/index.server";
import { events, matches, warbandMatches } from "@/db/schema";
import {
	MatchDeleteInputSchema,
	MatchParticipantsUpdateInputSchema,
	MatchSchema,
	MatchUpdateInputSchema,
	MatchWithParticipantsSchema,
} from "@/db/validation/match";

export const listMatches = createServerFn({ method: "GET" }).handler(() =>
	getDb().select().from(matches).orderBy(matches.createdAt),
);

export const createMatch = createServerFn({ method: "POST" })
	.validator(MatchSchema)
	.handler(async ({ data }) => {
		await getDb().insert(matches).values(data);
	});

export const createMatchWithParticipants = createServerFn({ method: "POST" })
	.validator(MatchWithParticipantsSchema)
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
	.validator(MatchUpdateInputSchema)
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
	.validator(MatchParticipantsUpdateInputSchema)
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
	.validator(MatchDeleteInputSchema)
	.handler(async ({ data }) => {
		const db = getDb();
		const referenced = await db
			.select({ id: events.id })
			.from(events)
			.where(eq(events.matchId, data.id))
			.limit(1);
		if (referenced.length > 0) {
			throw new Error("This match has event history and cannot be deleted.");
		}
		await db.batch([
			db.delete(warbandMatches).where(eq(warbandMatches.matchId, data.id)),
			db.delete(matches).where(eq(matches.id, data.id)),
		]);
	});
