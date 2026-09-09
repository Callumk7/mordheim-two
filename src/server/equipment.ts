import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/index.server";
import { equipment } from "@/db/schema";
import {
	EquipmentDeleteInputSchema,
	EquipmentSchema,
	EquipmentUpdateInputSchema,
} from "@/db/validation/equipment";

export const listEquipment = createServerFn({ method: "GET" }).handler(() =>
	getDb().select().from(equipment).orderBy(equipment.name),
);

export const createEquipment = createServerFn({ method: "POST" })
	.validator(EquipmentSchema)
	.handler(async ({ data }) => {
		await getDb().insert(equipment).values(data);
	});

export const updateEquipment = createServerFn({ method: "POST" })
	.validator(EquipmentUpdateInputSchema)
	.handler(async ({ data }) => {
		if (Object.keys(data.changes).length === 0) return;

		await getDb()
			.update(equipment)
			.set({
				...data.changes,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(equipment.id, data.id));
	});

export const deleteEquipment = createServerFn({ method: "POST" })
	.validator(EquipmentDeleteInputSchema)
	.handler(async ({ data }) => {
		await getDb().delete(equipment).where(eq(equipment.id, data.id));
	});
