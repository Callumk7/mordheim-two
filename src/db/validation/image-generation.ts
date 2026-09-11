import { z } from "zod";

export const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";
export const OPENAI_IMAGE_MODEL = "gpt-image-2";
export const IMAGE_GENERATION_MODELS = [
	GEMINI_IMAGE_MODEL,
	OPENAI_IMAGE_MODEL,
] as const;
export type ImageGenerationModel = (typeof IMAGE_GENERATION_MODELS)[number];
export const ImageGenerationModelSchema = z.enum(IMAGE_GENERATION_MODELS);

export const ImageGenerationInputSchema = z.object({
	prompt: z.string().trim().min(1).max(4000),
	model: ImageGenerationModelSchema.default(GEMINI_IMAGE_MODEL),
});

export const ImageGenerationMessageSchema = z.object({
	jobId: z.uuid(),
});

export type ImageGenerationMessage = z.infer<
	typeof ImageGenerationMessageSchema
>;
