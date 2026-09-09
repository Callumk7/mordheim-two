import { z } from "zod";

export const WarriorPortraitInputSchema = z
	.object({
		warriorId: z.string().trim().min(1),
	})
	.strict();
