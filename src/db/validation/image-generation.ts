import { z } from "zod";

export const IMAGE_GENERATION_PROMPT_MAX_LENGTH = 4000;

export const ImageGenerationInputSchema = z.object({
	prompt: z.string().trim().min(1).max(IMAGE_GENERATION_PROMPT_MAX_LENGTH),
});

export const ImageGenerationMessageSchema = z.object({
	jobId: z.uuid(),
});

export type ImageGenerationMessage = z.infer<
	typeof ImageGenerationMessageSchema
>;
