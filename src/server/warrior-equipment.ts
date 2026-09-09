import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/index.server";
import { warriorEquipment } from "@/db/schema";
import {
	WarriorEquipmentDeleteInputSchema,
	WarriorEquipmentSchema,
} from "@/db/validation/warrior-equipment";

export const listWarriorEquipment = createServerFn({ method: "GET" }).handler(
	() => getDb().select().from(warriorEquipment),
);

export const createWarriorEquipment = createServerFn({ method: "POST" })
	.validator(WarriorEquipmentSchema)
	.handler(async ({ data }) => {
		await getDb().insert(warriorEquipment).values(data);
	});

export const deleteWarriorEquipment = createServerFn({ method: "POST" })
	.validator(WarriorEquipmentDeleteInputSchema)
	.handler(async ({ data }) => {
		await getDb()
			.delete(warriorEquipment)
			.where(eq(warriorEquipment.id, data.id));
	});
