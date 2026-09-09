import { z } from "zod";

export const EQUIPMENT_TYPES = ["weapon", "armour"] as const;

export const EquipmentTypeSchema = z.enum(EQUIPMENT_TYPES);

const EquipmentTextSchema = z.string().trim().min(1);

export const EquipmentFieldsSchema = z.object({
	name: EquipmentTextSchema,
	// Display text, not a calculated price: costs can include dice, braces or multipliers.
	cost: EquipmentTextSchema.nullable(),
	availability: EquipmentTextSchema.nullable(),
	range: EquipmentTextSchema.nullable(),
	strength: EquipmentTextSchema.nullable(),
	specialRules: z.array(EquipmentTextSchema),
	type: EquipmentTypeSchema,
	// The displayed armour-save stat; conditional saving effects remain in sourceText.
	save: EquipmentTextSchema.nullable(),
	sourceUrl: z.url().nullable(),
	// Per-item source transcription includes rules, tables and introductory qualifications.
	sourceText: EquipmentTextSchema.nullable(),
	notes: EquipmentTextSchema.nullable(),
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
