import { GoogleGenAI, type Interactions } from "@google/genai";
import { GEMINI_IMAGE_MODEL } from "@/db/validation/image-generation";
import { GENERATION_TIMEOUT_MS } from "../generation/config";
import { GenerationError, sanitizeProviderError } from "../generation/errors";
import { decodeJpeg } from "../generation/jpeg";
import type { ImageGenerator } from "../generation/types";

export function createGeminiGenerator(apiKey: string): ImageGenerator {
	const client = new GoogleGenAI({ apiKey });
	return {
		model: GEMINI_IMAGE_MODEL,
		async generate(prompt) {
			try {
				const interaction = await client.interactions.create(
					{
						model: GEMINI_IMAGE_MODEL,
						input: prompt,
						stream: false,
						store: false,
						response_format: {
							type: "image",
							mime_type: "image/jpeg",
							aspect_ratio: "1:1",
							image_size: "1K",
						} satisfies Interactions.ImageResponseFormat,
					},
					{
						// Only Queues retries provider requests.
						maxRetries: 0,
						timeout: GENERATION_TIMEOUT_MS,
						signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
					},
				);
				if (interaction.status !== "completed" || !interaction.output_image) {
					throw new GenerationError(
						"Provider did not return a completed image.",
						true,
					);
				}
				return decodeJpeg(
					interaction.output_image.data,
					interaction.output_image.mime_type,
				);
			} catch (error) {
				throw sanitizeProviderError(error);
			}
		},
	};
}
