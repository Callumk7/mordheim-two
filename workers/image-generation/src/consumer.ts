import type { imageGenerationJobs } from "@/db/schema";
import { ImageGenerationMessageSchema } from "@/db/validation/image-generation";

type Job = typeof imageGenerationJobs.$inferSelect;
type LoadJob = (jobId: string) => Promise<Job | undefined>;

// Kept separate from the Worker entrypoint so delivery behavior is unit-testable.
export async function consumeImageGenerationBatch(
	batch: MessageBatch<unknown>,
	loadJob: LoadJob,
) {
	for (const message of batch.messages) {
		try {
			const { jobId } = ImageGenerationMessageSchema.parse(message.body);
			const job = await loadJob(jobId);
			if (!job) {
				throw new Error("Image generation job not found");
			}

			// Scaffold ONLY: no provider call, result storage, or completion update.
			// Replace this with durable, idempotent processing before using real jobs.
			// Never log the prompt or the entire message body.
			console.info("Image generation scaffold consumed job", { jobId: job.id });
			message.ack();
		} catch {
			// Retry individually so a bad message doesn't replay successful siblings.
			// Malformed/missing jobs also reach the configured DLQ after retries.
			console.error("Image generation message failed; retrying", {
				messageId: message.id,
				attempts: message.attempts,
			});
			message.retry();
		}
	}
}
