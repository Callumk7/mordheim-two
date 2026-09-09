import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { BasicIndex, collectionOptions } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import {
	EquipmentSchema,
	EquipmentUpdateSchema,
} from "@/db/validation/equipment";
import {
	createEquipment,
	deleteEquipment,
	listEquipment,
	updateEquipment,
} from "@/server/equipment";

export const equipmentCollectionOptions = collectionOptions(
	"equipment",
	(client) =>
		queryCollectionOptions({
			id: "equipment",
			autoIndex: "eager",
			defaultIndexType: BasicIndex,
			queryKey: ["equipment"],
			queryClient: client.requireDependency<QueryClient>("queryClient"),
			queryFn: () => listEquipment(),
			getKey: (item) => item.id,
			schema: EquipmentSchema,
			onInsert: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						createEquipment({
							data: EquipmentSchema.parse(mutation.modified),
						}),
					),
				);
			},
			onUpdate: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						updateEquipment({
							data: {
								id: mutation.original.id,
								changes: EquipmentUpdateSchema.parse(mutation.changes),
							},
						}),
					),
				);
			},
			onDelete: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						deleteEquipment({ data: { id: mutation.original.id } }),
					),
				);
			},
		}),
);
