import OpenAI from "openai";
import { OPENAI_IMAGE_MODEL } from "@/db/validation/image-generation";
import { GENERATION_TIMEOUT_MS } from "../generation/config";
import { GenerationError, sanitizeProviderError } from "../generation/errors";
import { decodeJpeg } from "../generation/jpeg";
import type { ImageGenerator } from "../generation/types";

export function createOpenAIImageGenerator(apiKey: string): ImageGenerator {
	const client = new OpenAI({
		apiKey,
		maxRetries: 0,
		timeout: GENERATION_TIMEOUT_MS,
	});
	return {
		model: OPENAI_IMAGE_MODEL,
		async generate(prompt) {
			try {
				const response = await client.images.generate(
					{
						model: OPENAI_IMAGE_MODEL,
						prompt,
						n: 1,
						quality: "medium",
						size: "1024x1024",
						output_format: "jpeg",
					},
					{ signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS) },
				);
				const image = response.data?.[0];
				if (!image?.b64_json) {
					throw new GenerationError(
						"Provider did not return a completed image.",
						true,
					);
				}
				return decodeJpeg(image.b64_json);
			} catch (error) {
				throw sanitizeProviderError(error);
			}
		},
	};
}
