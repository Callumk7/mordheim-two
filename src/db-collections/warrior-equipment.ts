import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { BasicIndex, collectionOptions } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { WarriorEquipmentSchema } from "@/db/validation/warrior-equipment";
import {
	createWarriorEquipment,
	deleteWarriorEquipment,
	listWarriorEquipment,
} from "@/server/warrior-equipment";

export const warriorEquipmentCollectionOptions = collectionOptions(
	"warriorEquipment",
	(client) =>
		queryCollectionOptions({
			id: "warriorEquipment",
			autoIndex: "eager",
			defaultIndexType: BasicIndex,
			queryKey: ["warriorEquipment"],
			queryClient: client.requireDependency<QueryClient>("queryClient"),
			queryFn: () => listWarriorEquipment(),
			getKey: (assignment) => assignment.id,
			schema: WarriorEquipmentSchema,
			onInsert: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						createWarriorEquipment({
							data: WarriorEquipmentSchema.parse(mutation.modified),
						}),
					),
				);
			},
			onDelete: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						deleteWarriorEquipment({ data: { id: mutation.original.id } }),
					),
				);
			},
		}),
);
