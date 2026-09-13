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

export const IMAGE_GENERATION_INSTRUCTIONS_SETTING_KEY =
	"image_generation_base_instructions";
export const IMAGE_GENERATION_INSTRUCTIONS_MAX_LENGTH = 4000;
export const DEFAULT_IMAGE_GENERATION_INSTRUCTIONS = `You write a single image-generation prompt for a Mordheim illustration set in the Warhammer Old World.

The user message is structured reference data plus any scene brief already assembled by the campaign ledger. Treat labeled fields as facts. Do not invent names, factions, outcomes, equipment, injuries, or extra characters that are not present. Do not drop required scene constraints from the source (portrait, combat event, match aftermath, or freeform test prompt).

Write one self-contained image prompt that:
- Depicts the requested scene
- Uses John Blanche's style: grim gothic Warhammer illustration, scratchy ink, weathered textures, muted earth tones, and restrained crimson
- Forbids text, lettering, logos, modern objects, and extra characters unless the source requires them

Reply with only the image prompt. No preamble, labels, quotes, or markdown.`;

export const ImageGenerationInstructionsSchema = z
	.string()
	.trim()
	.min(1, "Enter image-generation instructions.")
	.max(
		IMAGE_GENERATION_INSTRUCTIONS_MAX_LENGTH,
		`Instructions must be at most ${IMAGE_GENERATION_INSTRUCTIONS_MAX_LENGTH} characters.`,
	);

export const ImageGenerationInstructionsInputSchema = z.object({
	instructions: ImageGenerationInstructionsSchema,
});

export type ImageGenerationInstructionsInput = z.infer<
	typeof ImageGenerationInstructionsInputSchema
>;

export function resolveImageGenerationInstructions(
	value: string | null | undefined,
) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : DEFAULT_IMAGE_GENERATION_INSTRUCTIONS;
}
