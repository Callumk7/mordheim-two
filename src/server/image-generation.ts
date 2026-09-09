import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import type { Database } from "@/db/index.server";
import { getDb } from "@/db/index.server";
import { imageGenerationJobs } from "@/db/schema";
import type { ImageGenerationMessage } from "@/db/validation/image-generation";
import { ImageGenerationInputSchema } from "@/db/validation/image-generation";

export async function enqueueImageGeneration(
	db: Pick<Database, "insert" | "update" | "select">,
	queue: Pick<Queue<ImageGenerationMessage>, "send">,
	prompt: string,
	warriorId?: string,
) {
	const jobId = crypto.randomUUID();
	if (warriorId !== undefined) {
		const inserted = await db
			.insert(imageGenerationJobs)
			.values({ id: jobId, prompt, warriorId })
			.onConflictDoNothing({ target: imageGenerationJobs.warriorId })
			.returning({ id: imageGenerationJobs.id })
			.get();
		if (!inserted) {
			const existing = await db
				.select({
					jobId: imageGenerationJobs.id,
					status: imageGenerationJobs.status,
				})
				.from(imageGenerationJobs)
				.where(eq(imageGenerationJobs.warriorId, warriorId))
				.get();
			if (!existing)
				throw new Error(
					"Portrait association changed. Refresh before trying again.",
				);
			return existing;
		}
	} else {
		await db.insert(imageGenerationJobs).values({ id: jobId, prompt });
	}

	try {
		// Keep the prompt in D1; the consumer loads it using this ID.
		await queue.send({ jobId });
	} catch {
		await db
			.update(imageGenerationJobs)
			.set({
				status: "enqueue_failed",
				error: "Queue submission failed; delivery may be uncertain.",
				updatedAt: new Date().toISOString(),
			})
			.where(
				and(
					eq(imageGenerationJobs.id, jobId),
					eq(imageGenerationJobs.status, "pending"),
				),
			);
		return { jobId, status: "enqueue_failed" as const };
	}

	// Deliberately outside the catch: a D1 failure here does not mean send failed.
	// Delivery can race this update; never overwrite a consumer's job state.
	await db
		.update(imageGenerationJobs)
		.set({ status: "queued", updatedAt: new Date().toISOString() })
		.where(
			and(
				eq(imageGenerationJobs.id, jobId),
				eq(imageGenerationJobs.status, "pending"),
			),
		);
	return { jobId, status: "queued" as const };
}

// Like the existing mutations, this endpoint currently has no application auth.
// Add authorization and rate limiting before enabling paid image generation.
export const createImageGenerationJob = createServerFn({ method: "POST" })
	.validator(ImageGenerationInputSchema)
	.handler(({ data }) =>
		enqueueImageGeneration(getDb(), env.IMAGE_GENERATION_QUEUE, data.prompt),
	);
