import { and, eq } from "drizzle-orm";
import type { Database } from "@/db/index.server";
import { type Clock, systemClock } from "@/db/operations/clock";
import { imageGenerationJobs } from "@/db/schema";
import type { ImageGenerationMessage } from "@/db/validation/image-generation";

type ImageGenerationAssociation =
	| { warriorId: string; eventId?: never }
	| { eventId: string; warriorId?: never };

export async function enqueueImageGeneration(
	db: Pick<Database, "insert" | "update" | "select">,
	queue: Pick<Queue<ImageGenerationMessage>, "send">,
	prompt: string,
	association?: ImageGenerationAssociation,
	clock: Clock = systemClock,
) {
	const jobId = crypto.randomUUID();
	if (association) {
		const associationColumn = association.warriorId
			? imageGenerationJobs.warriorId
			: imageGenerationJobs.eventId;
		const associationId = association.warriorId ?? association.eventId;
		const inserted = await db
			.insert(imageGenerationJobs)
			.values({ id: jobId, prompt, ...association })
			.onConflictDoNothing({ target: associationColumn })
			.returning({ id: imageGenerationJobs.id })
			.get();
		if (!inserted) {
			const existing = await db
				.select({
					jobId: imageGenerationJobs.id,
					status: imageGenerationJobs.status,
				})
				.from(imageGenerationJobs)
				.where(eq(associationColumn, associationId))
				.get();
			if (!existing)
				throw new Error(
					"Image association changed. Refresh before trying again.",
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
				updatedAt: clock(),
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
		.set({ status: "queued", updatedAt: clock() })
		.where(
			and(
				eq(imageGenerationJobs.id, jobId),
				eq(imageGenerationJobs.status, "pending"),
			),
		);
	return { jobId, status: "queued" as const };
}
