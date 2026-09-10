import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import * as operations from "@/db/operations/queue-jobs.server";

// Like the queue playground, this diagnostic endpoint has no application auth.
// Protect it before storing private prompts or exposing this app publicly.
export const listQueueJobs = createServerFn({ method: "GET" }).handler(() =>
	operations.listQueueJobs(getDb()),
);
