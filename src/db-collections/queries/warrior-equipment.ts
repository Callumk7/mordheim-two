import {
	type Collection,
	eq,
	type InitialQueryBuilder,
} from "@tanstack/react-db";
import type { Equipment } from "@/db/validation/equipment";
import type { WarriorEquipment } from "@/db/validation/warrior-equipment";

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

type EquipmentCollections = {
	equipment: StringKeyedCollection<Equipment>;
	warriorEquipment: StringKeyedCollection<WarriorEquipment>;
};

export function equipmentCatalogueQuery({ equipment }: EquipmentCollections) {
	return (q: InitialQueryBuilder) =>
		q.from({ equipment }).orderBy(({ equipment }) => equipment.name);
}

export function warriorEquipmentQuery(
	{ equipment, warriorEquipment }: EquipmentCollections,
	warriorId: string,
) {
	return (q: InitialQueryBuilder) =>
		q
			.from({ assignment: warriorEquipment })
			.where(({ assignment }) => eq(assignment.warriorId, warriorId))
			.innerJoin({ equipment }, ({ assignment, equipment }) =>
				eq(assignment.equipmentId, equipment.id),
			)
			.select(({ assignment, equipment }) => ({
				assignmentId: assignment.id,
				equipmentId: equipment.id,
				name: equipment.name,
				type: equipment.type,
				cost: equipment.cost,
				availability: equipment.availability,
				range: equipment.range,
				strength: equipment.strength,
				save: equipment.save,
				specialRules: equipment.specialRules,
				notes: equipment.notes,
			}))
			.orderBy(({ equipment }) => equipment.name);
}
