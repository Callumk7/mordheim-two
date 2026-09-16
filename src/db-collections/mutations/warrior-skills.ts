import { safeRandomUUID } from "@tanstack/react-db";
import { deleteSkill } from "@/server/skills";
import type { AppCollections } from "..";

export function assignSkillTransaction(
	collections: AppCollections,
	warriorId: string,
	skillId: string,
) {
	const now = new Date().toISOString();
	return collections.warriorSkills.insert({
		id: safeRandomUUID(),
		warriorId,
		skillId,
		createdAt: now,
		updatedAt: now,
	});
}

export async function createAndAssignSkillTransaction(
	collections: AppCollections,
	warriorId: string,
	values: { name: string; description: string },
) {
	const now = new Date().toISOString();
	const skillId = safeRandomUUID();
	const skillTransaction = collections.skills.insert({
		id: skillId,
		...values,
		createdAt: now,
		updatedAt: now,
	});
	await skillTransaction.isPersisted.promise;
	const assignmentTransaction = collections.warriorSkills.insert({
		id: safeRandomUUID(),
		warriorId,
		skillId,
		createdAt: now,
		updatedAt: now,
	});
	try {
		await assignmentTransaction.isPersisted.promise;
		return assignmentTransaction;
	} catch (cause) {
		await deleteSkill({ data: { id: skillId } });
		await collections.skills.utils.refetch();
		throw cause;
	}
}

export function removeSkillTransaction(
	collections: AppCollections,
	assignmentId: string,
) {
	return collections.warriorSkills.delete(assignmentId);
}
