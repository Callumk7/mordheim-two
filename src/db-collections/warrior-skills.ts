import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { BasicIndex, collectionOptions } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { WarriorSkillSchema } from "@/db/validation/warrior-skill";
import {
	createWarriorSkill,
	deleteWarriorSkill,
	listWarriorSkills,
} from "@/server/warrior-skills";

export const warriorSkillsCollectionOptions = collectionOptions(
	"warriorSkills",
	(client) =>
		queryCollectionOptions({
			id: "warriorSkills",
			autoIndex: "eager",
			defaultIndexType: BasicIndex,
			queryKey: ["warriorSkills"],
			queryClient: client.requireDependency<QueryClient>("queryClient"),
			queryFn: () => listWarriorSkills(),
			getKey: (assignment) => assignment.id,
			schema: WarriorSkillSchema,
			onInsert: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						createWarriorSkill({
							data: WarriorSkillSchema.parse(mutation.modified),
						}),
					),
				);
			},
			onDelete: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						deleteWarriorSkill({ data: { id: mutation.original.id } }),
					),
				);
			},
		}),
);
