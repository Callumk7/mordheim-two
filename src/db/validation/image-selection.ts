import { z } from "zod";

export const WarriorImageSelectionSchema = z
	.object({
		warriorId: z.string().trim().min(1),
		jobId: z.string().trim().min(1),
	})
	.strict();

export const EventImageSelectionSchema = z
	.object({
		eventId: z.string().trim().min(1),
		jobId: z.string().trim().min(1),
	})
	.strict();

export const MatchImageSelectionSchema = z
	.object({
		matchId: z.string().trim().min(1),
		jobId: z.string().trim().min(1),
	})
	.strict();
