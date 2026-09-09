import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { imageGenerationJobs } from "@/db/schema";
import { consumeImageGenerationBatch } from "./consumer";

export default {
	async queue(batch, env) {
		// Use this Worker's bindings, not the app's request-scoped server modules.
		const db = drizzle(env.DB);
		await consumeImageGenerationBatch(batch, (jobId) =>
			db
				.select()
				.from(imageGenerationJobs)
				.where(eq(imageGenerationJobs.id, jobId))
				.get(),
		);
	},
} satisfies ExportedHandler<ImageGenerationConsumerEnv>;
