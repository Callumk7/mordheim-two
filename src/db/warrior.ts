import z from "zod";

export const WARRIOR_STATUSES = ["Alive", "Dead"] as const;

export const WarriorStatusSchema = z.enum(WARRIOR_STATUSES);

export const WarriorFieldsSchema = z.object({
	name: z.string().trim().min(1),
	class: z.string().trim().min(1),
	status: WarriorStatusSchema,
	warbandId: z.string().min(1),
	knocked: z.number().int().nonnegative(),
	injuries: z.number().int().nonnegative(),
	knockedDowns: z.number().int().nonnegative(),
});

export const WarriorSchema = WarriorFieldsSchema.extend({
	id: z.string().min(1),
	createdAt: z.string().default(() => new Date().toISOString()),
	updatedAt: z.string().default(() => new Date().toISOString()),
});

export const WarriorUpdateSchema = WarriorFieldsSchema.partial().strict();

export type Warrior = z.output<typeof WarriorSchema>;
