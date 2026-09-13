import { drizzle } from "drizzle-orm/d1";
import { consumeImageGenerationBatch } from "./consumer/consume-batch";
import { createJobStore } from "./persistence/job-store";
import { createGeminiPromptRefiner } from "./providers/gemini-text";
import { createImageGeneratorRegistry } from "./providers/registry";

export default {
	async queue(batch, env) {
		await consumeImageGenerationBatch(batch, {
			jobs: createJobStore(drizzle(env.DB)),
			bucket: env.IMAGE_GENERATION_BUCKET,
			enabled: env.IMAGE_GENERATION_ENABLED === "true",
			getGenerator: createImageGeneratorRegistry(env),
			refinePrompt: createGeminiPromptRefiner(env.GEMINI_API_KEY),
		});
	},
} satisfies ExportedHandler<ImageGenerationConsumerEnv>;
