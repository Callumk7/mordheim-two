import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { collectionOptions } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { WarbandMatchSchema } from "@/db/warband-match";
import {
	createWarbandMatch,
	deleteWarbandMatch,
	listWarbandMatches,
} from "@/db/warband-matches.functions";

export const warbandMatchesCollectionOptions = collectionOptions(
	"warbandMatches",
	(client) =>
		queryCollectionOptions({
			id: "warbandMatches",
			queryKey: ["warbandMatches"],
			queryClient: client.requireDependency<QueryClient>("queryClient"),
			queryFn: () => listWarbandMatches(),
			getKey: (participant) => participant.id,
			schema: WarbandMatchSchema,
			onInsert: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						createWarbandMatch({
							data: WarbandMatchSchema.parse(mutation.modified),
						}),
					),
				);
			},
			onDelete: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						deleteWarbandMatch({ data: { id: mutation.original.id } }),
					),
				);
			},
		}),
);
