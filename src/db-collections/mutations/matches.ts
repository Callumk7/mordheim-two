import type { DbClient } from "@tanstack/react-db";
import type { Match } from "@/db/validation/match";
import type { WarbandMatch } from "@/db/validation/warband-match";
import {
	createMatchWithParticipants,
	deleteMatch,
	updateMatchWithParticipants,
} from "@/server/matches";
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

function persistConfirmedMatchWrites(
	collections: AppCollections,
	input: {
		id: string;
		changes: Partial<
			Pick<Match, "name" | "scenario" | "status" | "result" | "winnerWarbandId">
		>;
		additions: WarbandMatch[];
		removals: WarbandMatch[];
	},
) {
	if (Object.keys(input.changes).length > 0) {
		collections.matches.utils.writeUpdate({
			id: input.id,
			...input.changes,
		});
	}
	if (input.removals.length > 0) {
		collections.warbandMatches.utils.writeDelete(
			input.removals.map((participant) => participant.id),
		);
	}
	if (input.additions.length > 0) {
		collections.warbandMatches.utils.writeInsert(input.additions);
	}
}

export function updateMatchTransaction(
	dbClient: DbClient,
	collections: AppCollections,
	input: {
		id: string;
		changes: Partial<
			Pick<Match, "name" | "scenario" | "status" | "result" | "winnerWarbandId">
		>;
		additions: WarbandMatch[];
		removals: WarbandMatch[];
	},
) {
	if (input.additions.length === 0 && input.removals.length === 0) {
		return collections.matches.update(input.id, (draft) => {
			Object.assign(draft, input.changes);
		});
	}

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
			persistConfirmedMatchWrites(collections, input);
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
