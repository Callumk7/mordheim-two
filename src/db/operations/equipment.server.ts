import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { Database } from "@/db/index.server";
import { type Clock, systemClock } from "@/db/operations/clock";
import { equipment } from "@/db/schema";
import type {
	EquipmentDeleteInputSchema,
	EquipmentSchema,
	EquipmentUpdateInputSchema,
} from "@/db/validation/equipment";

export function listEquipment(db: Database) {
	return db.select().from(equipment).orderBy(equipment.name);
}

export async function createEquipment(
	db: Database,
	data: z.output<typeof EquipmentSchema>,
) {
	await db.insert(equipment).values(data);
}

export async function updateEquipment(
	db: Database,
	data: z.output<typeof EquipmentUpdateInputSchema>,
	clock: Clock = systemClock,
) {
	if (Object.keys(data.changes).length === 0) return;

	await db
		.update(equipment)
		.set({
			...data.changes,
			updatedAt: clock(),
		})
		.where(eq(equipment.id, data.id));
}

export async function deleteEquipment(
	db: Database,
	data: z.output<typeof EquipmentDeleteInputSchema>,
) {
	await db.delete(equipment).where(eq(equipment.id, data.id));
}
