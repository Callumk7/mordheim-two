import { createServerFn } from "@tanstack/react-start";
import { desc } from "drizzle-orm";
import { getDb } from "@/db/index.server";
import { imageGenerationJobs } from "@/db/schema";

// Like the queue playground, this diagnostic endpoint has no application auth.
// Protect it before storing private prompts or exposing this app publicly.
export const listQueueJobs = createServerFn({ method: "GET" }).handler(() =>
	getDb()
		.select()
		.from(imageGenerationJobs)
		.orderBy(desc(imageGenerationJobs.createdAt), desc(imageGenerationJobs.id))
		.limit(100)
		.all(),
);
