import { and, eq, inArray, lte, or } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { imageGenerationJobs as jobs } from "@/db/schema";

// Longer than Queues' 15-minute invocation wall-time ceiling: an expired owner
// cannot still be running when another delivery claims its job.
export const LEASE_MS = 16 * 60 * 1000;
export const MAX_DELIVERY_ATTEMPTS = 4; // wrangler max_retries: 3 + first delivery
export type ImageJob = typeof jobs.$inferSelect;
export type ImageResult = Pick<
	ImageJob,
	"resultKey" | "resultMimeType" | "resultBytes" | "resultEtag" | "resultModel"
>;

export function createJobStore(db: DrizzleD1Database, now = Date.now) {
	const eligible = () =>
		or(
			inArray(jobs.status, ["pending", "queued", "enqueue_failed"]),
			and(eq(jobs.status, "processing"), lte(jobs.leaseExpiresAt, now())),
		);
	const owned = (id: string, token: string) =>
		and(
			eq(jobs.id, id),
			eq(jobs.status, "processing"),
			eq(jobs.leaseToken, token),
		);
	async function updateOwned(
		id: string,
		token: string,
		values: Partial<typeof jobs.$inferInsert>,
	) {
		const updated = await db
			.update(jobs)
			.set({
				...values,
				updatedAt: new Date(now()).toISOString(),
			})
			.where(owned(id, token))
			.returning({ id: jobs.id })
			.get();
		if (!updated) throw new Error("Job lease lost");
	}
	return {
		load: (id: string) => db.select().from(jobs).where(eq(jobs.id, id)).get(),
		claim: (id: string, token: string) =>
			db
				.update(jobs)
				.set({
					status: "processing",
					leaseToken: token,
					leaseExpiresAt: now() + LEASE_MS,
					updatedAt: new Date(now()).toISOString(),
				})
				.where(and(eq(jobs.id, id), eligible()))
				.returning()
				.get(),
		complete: (id: string, token: string, result: ImageResult) =>
			updateOwned(id, token, {
				...result,
				status: "completed",
				error: null,
				leaseToken: null,
				leaseExpiresAt: null,
				completedAt: new Date(now()).toISOString(),
			}),
		fail: (id: string, token: string, error: string) =>
			updateOwned(id, token, {
				status: "failed",
				error,
				leaseToken: null,
				leaseExpiresAt: null,
			}),
		release: (id: string, token: string, error: string) =>
			updateOwned(id, token, {
				// Keep processing truthful while awaiting a retry, but release ownership.
				error,
				leaseToken: null,
				leaseExpiresAt: 0,
			}),
		// Best effort on the final delivery, including failures before a claim.
		// Never overwrite a live owner, historical receipt or completed result.
		exhaust: (id: string) =>
			db
				.update(jobs)
				.set({
					status: "failed",
					error: "Delivery retries exhausted; inspect DLQ before resubmitting.",
					leaseToken: null,
					leaseExpiresAt: null,
					updatedAt: new Date(now()).toISOString(),
				})
				.where(and(eq(jobs.id, id), eligible()))
				.run(),
	};
}
export type JobStore = ReturnType<typeof createJobStore>;
