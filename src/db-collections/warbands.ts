import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { collectionOptions } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { WarbandSchema, WarbandUpdateSchema } from "@/db/warband";
import {
	createWarband,
	deleteWarband,
	listWarbands,
	updateWarband,
} from "@/db/warbands.functions";

export const warbandsCollectionOptions = collectionOptions(
	"warbands",
	(client) =>
		queryCollectionOptions({
			id: "warbands",
			queryKey: ["warbands"],
			queryClient: client.requireDependency<QueryClient>("queryClient"),
			queryFn: () => listWarbands(),
			getKey: (warband) => warband.id,
			schema: WarbandSchema,
			onInsert: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						createWarband({ data: WarbandSchema.parse(mutation.modified) }),
					),
				);
			},
			onUpdate: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						updateWarband({
							data: {
								id: mutation.original.id,
								changes: WarbandUpdateSchema.parse(mutation.changes),
							},
						}),
					),
				);
			},
			onDelete: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						deleteWarband({ data: { id: mutation.original.id } }),
					),
				);
			},
		}),
);
