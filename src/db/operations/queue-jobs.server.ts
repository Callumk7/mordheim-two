import { desc } from "drizzle-orm";
import type { Database } from "@/db/index.server";
import { imageGenerationJobs } from "@/db/schema";

export function listQueueJobs(db: Database) {
	return db
		.select()
		.from(imageGenerationJobs)
		.orderBy(desc(imageGenerationJobs.createdAt), desc(imageGenerationJobs.id))
		.limit(100)
		.all();
}
