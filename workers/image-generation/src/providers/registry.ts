import {
	GEMINI_IMAGE_MODEL,
	OPENAI_IMAGE_MODEL,
} from "@/db/validation/image-generation";
import { GenerationError } from "../generation/errors";
import { createGeminiGenerator } from "./gemini";
import { createOpenAIImageGenerator } from "./openai";

type ProviderSecrets = Pick<
	ImageGenerationConsumerEnv,
	"GEMINI_API_KEY" | "OPENAI_API_KEY"
>;

export function createImageGeneratorRegistry(secrets: ProviderSecrets) {
	return (model: string) => {
		switch (model) {
			case GEMINI_IMAGE_MODEL:
				if (!secrets.GEMINI_API_KEY) {
					throw new GenerationError(
						"Consumer GEMINI_API_KEY is not configured.",
					);
				}
				return createGeminiGenerator(secrets.GEMINI_API_KEY);
			case OPENAI_IMAGE_MODEL:
				if (!secrets.OPENAI_API_KEY) {
					throw new GenerationError(
						"Consumer OPENAI_API_KEY is not configured.",
					);
				}
				return createOpenAIImageGenerator(secrets.OPENAI_API_KEY);
			default:
				throw new GenerationError("Unsupported image generation model.", true);
		}
	};
}
