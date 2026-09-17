import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { BasicIndex, collectionOptions } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { SkillSchema, SkillUpdateSchema } from "@/db/validation/skill";
import {
	createSkill,
	deleteSkill,
	listSkills,
	updateSkill,
} from "@/server/skills";

export const skillsCollectionOptions = collectionOptions("skills", (client) => {
	const queryClient = client.requireDependency<QueryClient>("queryClient");
	return queryCollectionOptions({
		id: "skills",
		autoIndex: "eager",
		defaultIndexType: BasicIndex,
		queryKey: ["skills"],
		queryClient,
		queryFn: () => listSkills(),
		getKey: (skill) => skill.id,
		schema: SkillSchema,
		onInsert: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map((mutation) =>
					createSkill({ data: SkillSchema.parse(mutation.modified) }),
				),
			);
		},
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map((mutation) =>
					updateSkill({
						data: {
							id: mutation.original.id,
							changes: SkillUpdateSchema.parse(mutation.changes),
						},
					}),
				),
			);
		},
		onDelete: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map((mutation) =>
					deleteSkill({ data: { id: mutation.original.id } }),
				),
			);
			await queryClient.refetchQueries({ queryKey: ["warriorSkills"] });
		},
	});
});
