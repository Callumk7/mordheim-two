import {
	type Collection,
	eq,
	type InitialQueryBuilder,
} from "@tanstack/react-db";
import type { Skill } from "@/db/validation/skill";
import type { WarriorSkill } from "@/db/validation/warrior-skill";

type StringKeyedCollection<T extends object> = Collection<
	T,
	string,
	// biome-ignore lint/suspicious/noExplicitAny: Allows arbitrary collection utilities.
	any,
	// biome-ignore lint/suspicious/noExplicitAny: Allows arbitrary collection schemas.
	any,
	// biome-ignore lint/suspicious/noExplicitAny: Allows arbitrary collection insert inputs.
	any
>;

type SkillCollections = {
	skills: StringKeyedCollection<Skill>;
	warriorSkills: StringKeyedCollection<WarriorSkill>;
};

export function skillsCatalogueQuery({ skills }: SkillCollections) {
	return (q: InitialQueryBuilder) =>
		q.from({ skill: skills }).orderBy(({ skill }) => skill.name);
}

export function warriorSkillsQuery(
	{ skills, warriorSkills }: SkillCollections,
	warriorId: string,
) {
	return (q: InitialQueryBuilder) =>
		q
			.from({ assignment: warriorSkills })
			.where(({ assignment }) => eq(assignment.warriorId, warriorId))
			.innerJoin({ skill: skills }, ({ assignment, skill }) =>
				eq(assignment.skillId, skill.id),
			)
			.select(({ assignment, skill }) => ({
				assignmentId: assignment.id,
				skillId: skill.id,
				name: skill.name,
				description: skill.description,
			}))
			.orderBy(({ skill }) => skill.name);
}
