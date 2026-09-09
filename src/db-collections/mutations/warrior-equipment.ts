import { safeRandomUUID } from "@tanstack/react-db";
import type { AppCollections } from "..";

export function equipWarriorTransaction(
	collections: AppCollections,
	warriorId: string,
	equipmentId: string,
) {
	const now = new Date().toISOString();
	return collections.warriorEquipment.insert({
		id: safeRandomUUID(),
		warriorId,
		equipmentId,
		createdAt: now,
		updatedAt: now,
	});
}

export function unequipWarriorTransaction(
	collections: AppCollections,
	assignmentId: string,
) {
	return collections.warriorEquipment.delete(assignmentId);
}
