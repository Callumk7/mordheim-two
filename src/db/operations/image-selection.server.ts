import { eq } from "drizzle-orm";
import type { Database } from "@/db/index.server";
import { events, imageGenerationJobs, matches, warriors } from "@/db/schema";

export type ImageEntityType = "warrior" | "event" | "match";

/**
 * Changes an entity's active image only after checking the job is completed and
 * belongs to that same entity. Database triggers repeat this invariant so no
 * other write path can install an invalid pointer.
 */
export async function selectActiveImageJob(
	db: Pick<Database, "select" | "update">,
	type: ImageEntityType,
	entityId: string,
	jobId: string,
) {
	const job = await db
		.select({
			status: imageGenerationJobs.status,
			warriorId: imageGenerationJobs.warriorId,
			eventId: imageGenerationJobs.eventId,
			matchId: imageGenerationJobs.matchId,
		})
		.from(imageGenerationJobs)
		.where(eq(imageGenerationJobs.id, jobId))
		.get();
	const associationId =
		type === "warrior"
			? job?.warriorId
			: type === "event"
				? job?.eventId
				: job?.matchId;
	if (!job || job.status !== "completed" || associationId !== entityId) {
		throw new Error(
			"Only a completed image generated for this record can be selected.",
		);
	}

	if (type === "warrior") {
		const updated = await db
			.update(warriors)
			.set({ activeImageJobId: jobId })
			.where(eq(warriors.id, entityId))
			.returning({ id: warriors.id })
			.get();
		if (!updated) throw new Error("Warrior no longer exists.");
	} else if (type === "event") {
		const updated = await db
			.update(events)
			.set({ activeImageJobId: jobId })
			.where(eq(events.id, entityId))
			.returning({ id: events.id })
			.get();
		if (!updated) throw new Error("Event no longer exists.");
	} else {
		const updated = await db
			.update(matches)
			.set({ activeImageJobId: jobId })
			.where(eq(matches.id, entityId))
			.returning({ id: matches.id })
			.get();
		if (!updated) throw new Error("Match no longer exists.");
	}

	return { jobId };
}
