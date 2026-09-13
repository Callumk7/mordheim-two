import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db/index.server";
import { type Clock, systemClock } from "@/db/operations/clock";
import { imageGenerationJobs } from "@/db/schema";
import type {
	ImageGenerationMessage,
	ImageGenerationModel,
} from "@/db/validation/image-generation";

type ImageGenerationAssociation =
	| { warriorId: string; eventId?: never; matchId?: never }
	| { eventId: string; warriorId?: never; matchId?: never }
	| { matchId: string; warriorId?: never; eventId?: never };

interface ImageGenerationOptions {
	prompt: string;
	model: ImageGenerationModel;
	association?: ImageGenerationAssociation;
}

type DeliveryDatabase = Pick<Database, "update">;

// "pending" and "enqueue_failed" are the only producer-owned states. Restricting
// every delivery write to them means a delivery racing the consumer can never
// overwrite "consumed", "processing", "completed" or "failed".
const PRODUCER_OWNED_STATUSES = ["pending", "enqueue_failed"] as const;

async function deliverImageGeneration(
	db: DeliveryDatabase,
	queue: Pick<Queue<ImageGenerationMessage>, "send">,
	jobId: string,
	clock: Clock,
) {
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
					inArray(imageGenerationJobs.status, PRODUCER_OWNED_STATUSES),
				),
			);
		return { jobId, status: "enqueue_failed" as const };
	}

	// Deliberately outside the catch: a D1 failure here does not mean send failed.
	// Delivery can race this update; never overwrite a consumer's job state.
	await db
		.update(imageGenerationJobs)
		.set({ status: "queued", error: null, updatedAt: clock() })
		.where(
			and(
				eq(imageGenerationJobs.id, jobId),
				inArray(imageGenerationJobs.status, PRODUCER_OWNED_STATUSES),
			),
		);
	return { jobId, status: "queued" as const };
}

/**
 * Re-delivers an existing job whose prompt is already durable in D1. Only jobs
 * left in "enqueue_failed" are retryable: every later state belongs to the
 * consumer, and re-sending those would duplicate paid generation work.
 */
export function retryImageGeneration(
	db: DeliveryDatabase,
	queue: Pick<Queue<ImageGenerationMessage>, "send">,
	jobId: string,
	clock: Clock = systemClock,
) {
	return deliverImageGeneration(db, queue, jobId, clock);
}

export async function enqueueImageGeneration(
	db: Pick<Database, "insert" | "update" | "select">,
	queue: Pick<Queue<ImageGenerationMessage>, "send">,
	options: ImageGenerationOptions,
	clock: Clock = systemClock,
) {
	const { prompt, model, association } = options;
	const jobId = crypto.randomUUID();
	if (association) {
		const associationColumn = association.warriorId
			? imageGenerationJobs.warriorId
			: association.eventId
				? imageGenerationJobs.eventId
				: imageGenerationJobs.matchId;
		const associationId =
			association.warriorId ?? association.eventId ?? association.matchId;
		if (associationId === undefined) {
			throw new Error("An image association ID is required.");
		}
		const inserted = await db
			.insert(imageGenerationJobs)
			.values({ id: jobId, prompt, model, ...association })
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
			// A job that never reached the queue is not a duplicate request. Deliver
			// the prompt already stored against it rather than stranding the job.
			if (existing.status === "enqueue_failed") {
				return deliverImageGeneration(db, queue, existing.jobId, clock);
			}
			return existing;
		}
	} else {
		await db.insert(imageGenerationJobs).values({ id: jobId, prompt, model });
	}

	return deliverImageGeneration(db, queue, jobId, clock);
}
