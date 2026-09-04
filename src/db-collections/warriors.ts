import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { collectionOptions } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { WarriorSchema, WarriorUpdateSchema } from "@/db/warrior";
import {
	createWarrior,
	deleteWarrior,
	listWarriors,
	updateWarrior,
} from "@/db/warriors.functions";

export const warriorsCollectionOptions = collectionOptions(
	"warriors",
	(client) =>
		queryCollectionOptions({
			id: "warriors",
			queryKey: ["warriors"],
			queryClient: client.requireDependency<QueryClient>("queryClient"),
			queryFn: () => listWarriors(),
			getKey: (warrior) => warrior.id,
			schema: WarriorSchema,
			onInsert: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						createWarrior({ data: WarriorSchema.parse(mutation.modified) }),
					),
				);
			},
			onUpdate: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						updateWarrior({
							data: {
								id: mutation.original.id,
								changes: WarriorUpdateSchema.parse(mutation.changes),
							},
						}),
					),
				);
			},
			onDelete: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						deleteWarrior({ data: { id: mutation.original.id } }),
					),
				);
			},
		}),
);
