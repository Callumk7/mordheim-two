import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { BasicIndex, collectionOptions } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { WarbandSchema, WarbandUpdateSchema } from "@/db/validation/warband";
import {
	archiveWarband,
	createWarband,
	deleteWarband,
	listWarbands,
	unarchiveWarband,
	updateWarband,
} from "@/server/warbands";

export const warbandsCollectionOptions = collectionOptions(
	"warbands",
	(client) =>
		queryCollectionOptions({
			id: "warbands",
			autoIndex: "eager",
			defaultIndexType: BasicIndex,
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
					transaction.mutations.map((mutation) => {
						if (
							"isArchived" in mutation.changes ||
							"archivedAt" in mutation.changes
						) {
							const warband = WarbandSchema.parse(mutation.modified);
							return warband.isArchived
								? archiveWarband({ data: { id: warband.id } })
								: unarchiveWarband({ data: { id: warband.id } });
						}
						return updateWarband({
							data: {
								id: mutation.original.id,
								changes: WarbandUpdateSchema.parse(mutation.changes),
							},
						});
					}),
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
