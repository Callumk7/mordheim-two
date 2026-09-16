import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import {
	queryEventImage,
	queryEventImageHistory,
	submitEventImage,
} from "@/db/operations/event-images.server";
import { selectActiveImageJob } from "@/db/operations/image-selection.server";
import { EventImageInputSchema } from "@/db/validation/event";
import { EventImageSelectionSchema } from "@/db/validation/image-selection";

// Unauthenticated spike RPC: protect this with the rest of the image-generation
// surface before enabling paid generation or exposing private campaign data.
export const getEventImage = createServerFn({ method: "GET" })
	.validator(EventImageInputSchema)
	.handler(async ({ data }) => {
		try {
			const db = getDb();
			const [job, history] = await Promise.all([
				queryEventImage(db, data.eventId),
				queryEventImageHistory(db, data.eventId),
			]);
			return { job: job ?? null, history };
		} catch {
			return {
				error:
					"Could not load event image status. Refresh this page to try again.",
			} as const;
		}
	});

export const createEventImage = createServerFn({ method: "POST" })
	.validator(EventImageInputSchema)
	.handler(async ({ data }) => {
		try {
			return await submitEventImage(
				getDb(),
				env.IMAGE_GENERATION_QUEUE,
				data.eventId,
			);
		} catch {
			return {
				error:
					"Could not confirm image submission. Wait a moment before trying again.",
			} as const;
		}
	});

export const selectEventImage = createServerFn({ method: "POST" })
	.validator(EventImageSelectionSchema)
	.handler(async ({ data }) => {
		try {
			return await selectActiveImageJob(
				getDb(),
				"event",
				data.eventId,
				data.jobId,
			);
		} catch {
			return {
				error:
					"Could not select that image. Choose a completed image for this event.",
			} as const;
		}
	});
