import { drizzle } from "drizzle-orm/d1";
import { consumeImageGenerationBatch } from "./consumer/consume-batch";
import { createJobStore } from "./persistence/job-store";
import { createImageGeneratorRegistry } from "./providers/registry";

export default {
	async queue(batch, env) {
		await consumeImageGenerationBatch(batch, {
			jobs: createJobStore(drizzle(env.DB)),
			bucket: env.IMAGE_GENERATION_BUCKET,
			enabled: env.IMAGE_GENERATION_ENABLED === "true",
			getGenerator: createImageGeneratorRegistry(env),
		});
	},
} satisfies ExportedHandler<ImageGenerationConsumerEnv>;
