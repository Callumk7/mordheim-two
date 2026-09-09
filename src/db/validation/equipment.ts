import { z } from "zod";

export const EQUIPMENT_TYPES = ["weapon", "armour"] as const;

export const EquipmentTypeSchema = z.enum(EQUIPMENT_TYPES);

export const EquipmentFieldsSchema = z.object({
	name: z.string().trim().min(1),
	cost: z.number().finite().nonnegative(),
	availability: z.string().trim().min(1),
	range: z.string().trim().min(1),
	strength: z.string().trim().min(1),
	specialRules: z.array(z.string().trim().min(1)),
	type: EquipmentTypeSchema,
	save: z.string().trim().min(1),
});

export const EquipmentSchema = EquipmentFieldsSchema.extend({
	id: z.string().min(1),
	createdAt: z.string().default(() => new Date().toISOString()),
	updatedAt: z.string().default(() => new Date().toISOString()),
});

export const EquipmentUpdateSchema = EquipmentFieldsSchema.partial().strict();

export const EquipmentUpdateInputSchema = z.object({
	id: z.string().min(1),
	changes: EquipmentUpdateSchema,
});

export const EquipmentDeleteInputSchema = z.object({ id: z.string().min(1) });

export type Equipment = z.output<typeof EquipmentSchema>;
