import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { WarriorSchema, WarriorUpdateSchema } from "#/db/warrior";
import {
	createWarrior,
	deleteWarrior,
	listWarriors,
	updateWarrior,
} from "#/db/warriors.functions";

function createWarriorsCollection(queryClient: QueryClient) {
	return createCollection(
		queryCollectionOptions({
			id: "warriors",
			queryKey: ["warriors"],
			queryClient,
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
}

export type WarrriorsCollection = ReturnType<typeof createWarriorsCollection>;

const collections = new WeakMap<QueryClient, WarrriorsCollection>();

export function getWarriorsCollection(queryClient: QueryClient) {
	const existingCollection = collections.get(queryClient);
	if (existingCollection) return existingCollection;

	const collection = createWarriorsCollection(queryClient);
	collections.set(queryClient, collection);
	return collection;
}
