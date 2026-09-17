import { z } from "zod";

export const WarriorSkillFieldsSchema = z.object({
	warriorId: z.string().min(1),
	skillId: z.string().min(1),
});

export const WarriorSkillSchema = WarriorSkillFieldsSchema.extend({
	id: z.string().min(1),
	createdAt: z.string().default(() => new Date().toISOString()),
	updatedAt: z.string().default(() => new Date().toISOString()),
});

export const WarriorSkillDeleteInputSchema = z.object({
	id: z.string().min(1),
});

export type WarriorSkill = z.output<typeof WarriorSkillSchema>;
