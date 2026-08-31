import { z } from "zod";

export const MATCH_STATUSES = ["Scheduled", "InProgress", "Completed"] as const;

export const MatchStatusSchema = z.enum(MATCH_STATUSES);

export const MatchFieldsSchema = z.object({
	name: z.string().trim().min(1),
	scenario: z.string().trim().min(1),
	status: MatchStatusSchema,
});

export const MatchSchema = MatchFieldsSchema.extend({
	id: z.string().min(1),
	createdAt: z.string().default(() => new Date().toISOString()),
	updatedAt: z.string().default(() => new Date().toISOString()),
});

export const MatchUpdateSchema = MatchFieldsSchema.partial().strict();

export type Match = z.output<typeof MatchSchema>;
