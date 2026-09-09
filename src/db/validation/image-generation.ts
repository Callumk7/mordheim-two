import { z } from "zod";

export const ImageGenerationInputSchema = z.object({
	prompt: z.string().trim().min(1).max(4000),
});

export const ImageGenerationMessageSchema = z.object({
	jobId: z.uuid(),
});

export type ImageGenerationMessage = z.infer<
	typeof ImageGenerationMessageSchema
>;
