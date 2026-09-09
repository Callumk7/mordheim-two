import { z } from "zod";

export const ImageGenerationInputSchema = z.object({
	prompt: z.string().trim().min(1).max(4000),
});

export type ImageGenerationMessage = {
	jobId: string;
};
