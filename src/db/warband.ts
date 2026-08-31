import { z } from "zod";

export const WARBAND_STATUSES = ["Ready", "Recovering", "Recruiting"] as const;

export const WarbandStatusSchema = z.enum(WARBAND_STATUSES);

export const WarbandFieldsSchema = z.object({
	name: z.string().trim().min(1),
	faction: z.string().trim().min(1),
	captain: z.string().trim().min(1),
	rating: z.number().int().nonnegative(),
	wins: z.number().int().nonnegative(),
	status: WarbandStatusSchema,
});

export const WarbandSchema = WarbandFieldsSchema.extend({
	id: z.string().min(1),
	createdAt: z.string().default(() => new Date().toISOString()),
	updatedAt: z.string().default(() => new Date().toISOString()),
});

export const WarbandUpdateSchema = WarbandFieldsSchema.partial().strict();

export type Warband = z.output<typeof WarbandSchema>;
