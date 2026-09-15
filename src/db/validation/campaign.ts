import { z } from "zod";

export const CampaignFieldsSchema = z.object({
	name: z.string().trim().min(1),
});

export const CampaignSchema = CampaignFieldsSchema.extend({
	id: z.string().min(1),
	createdAt: z.string().default(() => new Date().toISOString()),
	updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Campaign = z.output<typeof CampaignSchema>;
