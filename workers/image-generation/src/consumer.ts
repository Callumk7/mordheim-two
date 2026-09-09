import { ImageGenerationMessageSchema } from "@/db/validation/image-generation";

type RecordConsumption = (jobId: string) => Promise<{ id: string } | undefined>;

// Kept separate from the Worker entrypoint so delivery behavior is unit-testable.
export async function consumeImageGenerationBatch(
	batch: MessageBatch<unknown>,
	recordConsumption: RecordConsumption,
) {
	for (const message of batch.messages) {
		try {
			const { jobId } = ImageGenerationMessageSchema.parse(message.body);
			// Await durable receipt before acknowledging; D1 failures must retry.
			const job = await recordConsumption(jobId);
			if (!job) {
				throw new Error("Image generation job not found");
			}

			// Receipt only: no provider call or generated image yet.
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
