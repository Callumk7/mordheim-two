import { drizzle } from "drizzle-orm/d1";
import { consumeImageGenerationBatch } from "./consumer";
import { recordJobConsumption } from "./jobs";

export default {
	async queue(batch, env) {
		const db = drizzle(env.DB);
		await consumeImageGenerationBatch(batch, (jobId) =>
			recordJobConsumption(db, jobId),
		);
	},
} satisfies ExportedHandler<ImageGenerationConsumerEnv>;
