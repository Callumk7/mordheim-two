import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { Database } from "@/db/index.server";
import { warriorEquipment } from "@/db/schema";
import type {
	WarriorEquipmentDeleteInputSchema,
	WarriorEquipmentSchema,
} from "@/db/validation/warrior-equipment";

export function listWarriorEquipment(db: Database) {
	return db.select().from(warriorEquipment);
}

export async function createWarriorEquipment(
	db: Database,
	data: z.output<typeof WarriorEquipmentSchema>,
) {
	await db.insert(warriorEquipment).values(data);
}

export async function deleteWarriorEquipment(
	db: Database,
	data: z.output<typeof WarriorEquipmentDeleteInputSchema>,
) {
	await db.delete(warriorEquipment).where(eq(warriorEquipment.id, data.id));
}
