import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { type Match, MatchSchema, MatchUpdateSchema } from "../db/match";
import {
	createMatch,
	deleteMatch,
	listMatches,
	updateMatch,
} from "../db/matches.functions";

function createMatchesCollection(queryClient: QueryClient) {
	return createCollection(
		queryCollectionOptions({
			id: "matches",
			queryKey: ["matches"],
			queryClient,
			queryFn: () => listMatches(),
			getKey: (match) => match.id,
			schema: MatchSchema,
			onInsert: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						createMatch({ data: MatchSchema.parse(mutation.modified) }),
					),
				);
			},
			onUpdate: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						updateMatch({
							data: {
								id: mutation.original.id,
								changes: MatchUpdateSchema.parse(mutation.changes),
							},
						}),
					),
				);
			},
			onDelete: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						deleteMatch({ data: { id: mutation.original.id } }),
					),
				);
				await queryClient.invalidateQueries({ queryKey: ["events"] });
			},
		}),
	);
}

export type MatchesCollection = ReturnType<typeof createMatchesCollection>;

const collections = new WeakMap<QueryClient, MatchesCollection>();

export function getMatchesCollection(queryClient: QueryClient) {
	const existingCollection = collections.get(queryClient);
	if (existingCollection) return existingCollection;

	const collection = createMatchesCollection(queryClient);
	collections.set(queryClient, collection);
	return collection;
}

export type { Match };
