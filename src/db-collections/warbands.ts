import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import {
	type Warband,
	WarbandSchema,
	WarbandUpdateSchema,
} from "../db/warband";
import {
	createWarband,
	deleteWarband,
	listWarbands,
	updateWarband,
} from "../db/warbands.functions";

function createWarbandsCollection(queryClient: QueryClient) {
	return createCollection(
		queryCollectionOptions({
			id: "warbands",
			queryKey: ["warbands"],
			queryClient,
			queryFn: () => listWarbands(),
			getKey: (warband) => warband.id,
			schema: WarbandSchema,
			onInsert: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						createWarband({
							data: WarbandSchema.parse(mutation.modified),
						}),
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
}

export type WarbandsCollection = ReturnType<typeof createWarbandsCollection>;

const collections = new WeakMap<QueryClient, WarbandsCollection>();

export function getWarbandsCollection(queryClient: QueryClient) {
	const existingCollection = collections.get(queryClient);
	if (existingCollection) return existingCollection;

	const collection = createWarbandsCollection(queryClient);
	collections.set(queryClient, collection);
	return collection;
}

export type { Warband };
