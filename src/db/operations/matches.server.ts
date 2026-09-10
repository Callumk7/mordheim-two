import { and, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { z } from "zod";
import type { Database } from "@/db/index.server";
import { type Clock, systemClock } from "@/db/operations/clock";
import { events, matches, warbandMatches } from "@/db/schema";
import {
	type MatchDeleteInputSchema,
	type MatchParticipantsUpdateInputSchema,
	MatchSchema,
	type MatchUpdateInputSchema,
	type MatchWithParticipantsSchema,
} from "@/db/validation/match";

export function listMatches(db: Database) {
	return db.select().from(matches).orderBy(matches.createdAt);
}

export async function createMatch(
	db: Database,
	data: z.output<typeof MatchSchema>,
) {
	if (data.winnerWarbandId !== null) {
		throw new Error("Create winning matches together with their participants.");
	}
	await db.insert(matches).values(data);
}

export async function createMatchWithParticipants(
	db: Database,
	data: z.output<typeof MatchWithParticipantsSchema>,
) {
	if (
		data.participants.some(
			(participant) => participant.matchId !== data.match.id,
		)
	) {
		throw new Error("Every participant must belong to the created match.");
	}
	if (
		data.match.winnerWarbandId !== null &&
		!data.participants.some(
			(participant) => participant.warbandId === data.match.winnerWarbandId,
		)
	) {
		throw new Error("The winning warband must participate in the match.");
	}
	const { result, winnerWarbandId, ...pendingMatch } = data.match;
	const statements: BatchItem<"sqlite">[] = [
		db.insert(matches).values({
			...pendingMatch,
			result: "Pending",
			winnerWarbandId: null,
		}),
		...data.participants.map((participant) =>
			db.insert(warbandMatches).values(participant),
		),
		...(result === "Pending"
			? []
			: [
					db
						.update(matches)
						.set({ result, winnerWarbandId })
						.where(eq(matches.id, data.match.id)),
				]),
	];
	await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}

export async function updateMatch(
	db: Database,
	data: z.output<typeof MatchUpdateInputSchema>,
	clock: Clock = systemClock,
) {
	if (Object.keys(data.changes).length === 0) return;

	const [current] = await db
		.select()
		.from(matches)
		.where(eq(matches.id, data.id))
		.limit(1);
	if (!current) throw new Error("Match not found.");
	const updated = MatchSchema.parse({ ...current, ...data.changes });
	if (updated.winnerWarbandId !== null) {
		const [participant] = await db
			.select({ id: warbandMatches.id })
			.from(warbandMatches)
			.where(
				and(
					eq(warbandMatches.matchId, data.id),
					eq(warbandMatches.warbandId, updated.winnerWarbandId),
				),
			)
			.limit(1);
		if (!participant) {
			throw new Error("The winning warband must participate in the match.");
		}
	}

	await db
		.update(matches)
		.set({
			...data.changes,
			updatedAt: clock(),
		})
		.where(eq(matches.id, data.id));
}

export async function updateMatchWithParticipants(
	db: Database,
	data: z.output<typeof MatchParticipantsUpdateInputSchema>,
	clock: Clock = systemClock,
) {
	if (data.additions.some((participant) => participant.matchId !== data.id)) {
		throw new Error("Every participant must belong to the updated match.");
	}
	const [currentMatch, currentParticipants] = await Promise.all([
		db.select().from(matches).where(eq(matches.id, data.id)).limit(1),
		db
			.select({ id: warbandMatches.id, warbandId: warbandMatches.warbandId })
			.from(warbandMatches)
			.where(eq(warbandMatches.matchId, data.id)),
	]);
	if (!currentMatch[0]) throw new Error("Match not found.");
	const updated = MatchSchema.parse({ ...currentMatch[0], ...data.changes });
	const removedIds = new Set(data.removals);
	const finalWarbandIds = new Set([
		...currentParticipants
			.filter((participant) => !removedIds.has(participant.id))
			.map((participant) => participant.warbandId),
		...data.additions.map((participant) => participant.warbandId),
	]);
	if (
		updated.winnerWarbandId !== null &&
		!finalWarbandIds.has(updated.winnerWarbandId)
	) {
		throw new Error("The winning warband must participate in the match.");
	}
	const statements: BatchItem<"sqlite">[] = [
		...data.additions.map((participant) =>
			db.insert(warbandMatches).values(participant),
		),
		db
			.update(matches)
			.set({
				...data.changes,
				updatedAt: clock(),
			})
			.where(eq(matches.id, data.id)),
		...data.removals.map((id) =>
			db
				.delete(warbandMatches)
				.where(
					and(eq(warbandMatches.id, id), eq(warbandMatches.matchId, data.id)),
				),
		),
	];
	await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}

export async function deleteMatch(
	db: Database,
	data: z.output<typeof MatchDeleteInputSchema>,
) {
	const referenced = await db
		.select({ id: events.id })
		.from(events)
		.where(eq(events.matchId, data.id))
		.limit(1);
	if (referenced.length > 0) {
		throw new Error("This match has event history and cannot be deleted.");
	}
	await db.delete(matches).where(eq(matches.id, data.id));
}
