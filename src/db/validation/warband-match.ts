import { z } from "zod";

export const WarbandMatchFieldsSchema = z.object({
	warbandId: z.string().min(1),
	matchId: z.string().min(1),
});

export const WarbandMatchSchema = WarbandMatchFieldsSchema.extend({
	id: z.string().min(1),
	createdAt: z.string().default(() => new Date().toISOString()),
	updatedAt: z.string().default(() => new Date().toISOString()),
});

export const WarbandMatchDeleteInputSchema = z.object({
	id: z.string().min(1),
});

export type WarbandMatch = z.output<typeof WarbandMatchSchema>;
