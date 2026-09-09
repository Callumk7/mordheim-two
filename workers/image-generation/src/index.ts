import { drizzle } from "drizzle-orm/d1";
import { consumeImageGenerationBatch } from "./consumer";
import { createGeminiGenerator, GenerationError } from "./gemini";
import { createJobStore } from "./jobs";

export default {
	async queue(batch, env) {
		await consumeImageGenerationBatch(batch, {
			jobs: createJobStore(drizzle(env.DB)),
			bucket: env.IMAGE_GENERATION_BUCKET,
			enabled: env.IMAGE_GENERATION_ENABLED === "true",
			generate: async (prompt) => {
				if (!env.GEMINI_API_KEY)
					throw new GenerationError(
						"Consumer GEMINI_API_KEY is not configured.",
					);
				return createGeminiGenerator(env.GEMINI_API_KEY)(prompt);
			},
		});
	},
} satisfies ExportedHandler<ImageGenerationConsumerEnv>;
