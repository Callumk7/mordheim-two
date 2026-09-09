import { safeRandomUUID } from "@tanstack/react-db";
import type { Equipment } from "@/db/validation/equipment";
import type { AppCollections } from "..";

export type NewEquipment = Omit<Equipment, "id" | "createdAt" | "updatedAt">;
export type EquipmentChanges = Partial<NewEquipment>;

export function createEquipmentTransaction(
	collections: AppCollections,
	values: NewEquipment,
) {
	const now = new Date().toISOString();
	return collections.equipment.insert({
		id: safeRandomUUID(),
		...values,
		createdAt: now,
		updatedAt: now,
	});
}

export function updateEquipmentTransaction(
	collections: AppCollections,
	equipmentId: string,
	changes: EquipmentChanges,
) {
	return collections.equipment.update(equipmentId, (draft) => {
		Object.assign(draft, changes);
	});
}

export function deleteEquipmentTransaction(
	collections: AppCollections,
	equipmentId: string,
) {
	return collections.equipment.delete(equipmentId);
}
