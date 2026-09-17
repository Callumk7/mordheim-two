import { z } from "zod";

const SkillTextSchema = z.string().trim().min(1);

export const SkillFieldsSchema = z.object({
	name: SkillTextSchema,
	description: SkillTextSchema,
});

export const SkillSchema = SkillFieldsSchema.extend({
	id: z.string().min(1),
	createdAt: z.string().default(() => new Date().toISOString()),
	updatedAt: z.string().default(() => new Date().toISOString()),
});

export const SkillUpdateSchema = SkillFieldsSchema.partial().strict();

export const SkillUpdateInputSchema = z.object({
	id: z.string().min(1),
	changes: SkillUpdateSchema,
});

export const SkillDeleteInputSchema = z.object({ id: z.string().min(1) });

export type Skill = z.output<typeof SkillSchema>;
