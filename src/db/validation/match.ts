import { z } from "zod";
import { WarbandMatchSchema } from "./warband-match";

export const MATCH_STATUSES = ["Scheduled", "InProgress", "Completed"] as const;
export const MATCH_RESULTS = ["Pending", "Victory", "Draw"] as const;

export const MatchStatusSchema = z.enum(MATCH_STATUSES);
export const MatchResultSchema = z.enum(MATCH_RESULTS);

const MatchFieldShape = {
	name: z.string().trim().min(1),
	scenario: z.string().trim().min(1),
	status: MatchStatusSchema,
	result: MatchResultSchema,
	winnerWarbandId: z.string().min(1).nullable(),
};

export const MatchFieldsSchema = z
	.object(MatchFieldShape)
	.superRefine((match, context) => {
		if (match.result === "Victory" && match.winnerWarbandId === null) {
			context.addIssue({
				code: "custom",
				message: "A victorious match must have a winning warband.",
				path: ["winnerWarbandId"],
			});
		}
		if (match.result !== "Victory" && match.winnerWarbandId !== null) {
			context.addIssue({
				code: "custom",
				message: "Only a victorious match can have a winning warband.",
				path: ["winnerWarbandId"],
			});
		}
	});

export const MatchSchema = MatchFieldsSchema.extend({
	id: z.string().min(1),
	createdAt: z.string().default(() => new Date().toISOString()),
	updatedAt: z.string().default(() => new Date().toISOString()),
});

export const MatchUpdateSchema = z.object(MatchFieldShape).partial().strict();

export const MatchWithParticipantsSchema = z.object({
	match: MatchSchema,
	participants: z.array(WarbandMatchSchema),
});

export const MatchUpdateInputSchema = z.object({
	id: z.string().min(1),
	changes: MatchUpdateSchema,
});

export const MatchParticipantsUpdateInputSchema = z.object({
	id: z.string().min(1),
	changes: MatchUpdateSchema,
	additions: z.array(WarbandMatchSchema),
	removals: z.array(z.string().min(1)),
});

export const MatchDeleteInputSchema = z.object({ id: z.string().min(1) });

export type Match = z.output<typeof MatchSchema>;
