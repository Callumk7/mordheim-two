import { z } from "zod";

export const WarbandFieldsSchema = z.object({
	name: z.string().trim().min(1),
	faction: z.string().trim().min(1),
	bio: z.string().trim().nullish(),
	rating: z.number().int().nonnegative(),
	gold: z.number().int().nonnegative(),
	wins: z.number().int().nonnegative(),
});

export const WarbandSchema = WarbandFieldsSchema.extend({
	id: z.string().min(1),
	createdAt: z.string().default(() => new Date().toISOString()),
	updatedAt: z.string().default(() => new Date().toISOString()),
});

export const WarbandUpdateSchema = WarbandFieldsSchema.partial().strict();

export const WarbandUpdateInputSchema = z.object({
	id: z.string().min(1),
	changes: WarbandUpdateSchema,
});

export const WarbandDeleteInputSchema = z.object({ id: z.string().min(1) });

export type Warband = z.output<typeof WarbandSchema>;
