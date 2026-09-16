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

export async function enqueueImageGeneration(
	db: Pick<Database, "insert" | "update">,
	queue: Pick<Queue<ImageGenerationMessage>, "send">,
	options: ImageGenerationOptions,
	clock: Clock = systemClock,
) {
	const { prompt, model, association } = options;
	const jobId = crypto.randomUUID();
	// Every user request gets an immutable prompt snapshot and its own result key.
	// A later generation request never mutates or reuses historical work.
	await db
		.insert(imageGenerationJobs)
		.values({ id: jobId, prompt, model, ...association });

	return deliverImageGeneration(db, queue, jobId, clock);
}
