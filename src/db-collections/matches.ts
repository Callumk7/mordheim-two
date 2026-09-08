import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { BasicIndex, collectionOptions } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { MatchSchema, MatchUpdateSchema } from "@/db/match";
import {
	createMatch,
	deleteMatch,
	listMatches,
	updateMatch,
} from "@/db/matches.functions";

export const matchesCollectionOptions = collectionOptions("matches", (client) =>
	queryCollectionOptions({
		id: "matches",
		autoIndex: "eager",
		defaultIndexType: BasicIndex,
		queryKey: ["matches"],
		queryClient: client.requireDependency<QueryClient>("queryClient"),
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
		},
	}),
);
