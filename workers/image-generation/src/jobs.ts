import { eq, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { imageGenerationJobs } from "@/db/schema";

export function recordJobConsumption(db: DrizzleD1Database, jobId: string) {
	return db
		.update(imageGenerationJobs)
		.set({
			status: "consumed",
			error: null,
			// Preserve the first receipt time on duplicate delivery.
			updatedAt: sql`CASE WHEN ${imageGenerationJobs.status} = 'consumed' THEN ${imageGenerationJobs.updatedAt} ELSE ${new Date().toISOString()} END`,
		})
		.where(eq(imageGenerationJobs.id, jobId))
		.returning({ id: imageGenerationJobs.id })
		.get();
}
