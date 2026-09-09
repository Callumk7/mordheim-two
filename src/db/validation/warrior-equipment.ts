import { z } from "zod";

export const WarriorEquipmentFieldsSchema = z.object({
	warriorId: z.string().min(1),
	equipmentId: z.string().min(1),
});

export const WarriorEquipmentSchema = WarriorEquipmentFieldsSchema.extend({
	id: z.string().min(1),
	createdAt: z.string().default(() => new Date().toISOString()),
	updatedAt: z.string().default(() => new Date().toISOString()),
});

export const WarriorEquipmentDeleteInputSchema = z.object({
	id: z.string().min(1),
});

export type WarriorEquipment = z.output<typeof WarriorEquipmentSchema>;
