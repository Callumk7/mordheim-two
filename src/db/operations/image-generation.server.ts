import { and, eq } from "drizzle-orm";
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
			return existing;
		}
	} else {
		await db.insert(imageGenerationJobs).values({ id: jobId, prompt, model });
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
