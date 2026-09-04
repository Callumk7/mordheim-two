import type { DbClient } from "@tanstack/react-db";
import type { Match } from "@/db/match";
import {
	createMatchWithParticipants,
	deleteMatch,
	updateMatchWithParticipants,
} from "@/db/matches.functions";
import type { WarbandMatch } from "@/db/warband-match";
import type { AppCollections } from "..";

export function createMatchTransaction(
	dbClient: DbClient,
	collections: AppCollections,
	match: Match,
	participants: WarbandMatch[],
) {
	const transaction = dbClient.createTransaction({
		mutationFn: async () => {
			await createMatchWithParticipants({ data: { match, participants } });
			await Promise.all([
				collections.matches.utils.refetch(),
				collections.warbandMatches.utils.refetch(),
			]);
		},
	});

	transaction.mutate(() => {
		collections.matches.insert(match);
		if (participants.length > 0) {
			collections.warbandMatches.insert(participants);
		}
	});
	return transaction;
}

export function updateMatchTransaction(
	dbClient: DbClient,
	collections: AppCollections,
	input: {
		id: string;
		changes: Partial<Pick<Match, "name" | "scenario" | "status">>;
		additions: WarbandMatch[];
		removals: WarbandMatch[];
	},
) {
	const transaction = dbClient.createTransaction({
		mutationFn: async () => {
			await updateMatchWithParticipants({
				data: {
					id: input.id,
					changes: input.changes,
					additions: input.additions,
					removals: input.removals.map((participant) => participant.id),
				},
			});
			await Promise.all([
				collections.matches.utils.refetch(),
				collections.warbandMatches.utils.refetch(),
			]);
		},
	});

	transaction.mutate(() => {
		collections.matches.update(input.id, (draft) => {
			Object.assign(draft, input.changes);
		});
		if (input.removals.length > 0) {
			collections.warbandMatches.delete(
				input.removals.map((participant) => participant.id),
			);
		}
		if (input.additions.length > 0) {
			collections.warbandMatches.insert(input.additions);
		}
	});
	return transaction;
}

export function deleteMatchTransaction(
	dbClient: DbClient,
	collections: AppCollections,
	matchId: string,
	participantIds: string[],
	eventIds: string[],
) {
	const transaction = dbClient.createTransaction({
		mutationFn: async () => {
			await deleteMatch({ data: { id: matchId } });
			await Promise.all([
				collections.matches.utils.refetch(),
				collections.warbandMatches.utils.refetch(),
				collections.events.utils.refetch(),
			]);
		},
	});
	transaction.mutate(() => {
		if (eventIds.length > 0) collections.events.delete(eventIds);
		if (participantIds.length > 0) {
			collections.warbandMatches.delete(participantIds);
		}
		collections.matches.delete(matchId);
	});
	return transaction;
}
