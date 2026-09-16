import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import { selectActiveImageJob } from "@/db/operations/image-selection.server";
import {
	queryMatchEventImages,
	queryMatchImage,
	queryMatchImageHistory,
	submitCompletedMatchImage,
} from "@/db/operations/match-images.server";
import { MatchImageSelectionSchema } from "@/db/validation/image-selection";
import { MatchImageInputSchema } from "@/db/validation/match";

// Unauthenticated spike RPC: protect this with the rest of the image-generation
// surface before enabling paid generation or exposing private campaign data.
export const getMatchImagery = createServerFn({ method: "GET" })
	.validator(MatchImageInputSchema)
	.handler(async ({ data }) => {
		try {
			const db = getDb();
			const [match, matchHistory, eventJobs] = await Promise.all([
				queryMatchImage(db, data.matchId),
				queryMatchImageHistory(db, data.matchId),
				queryMatchEventImages(db, data.matchId),
			]);
			return {
				match: match ?? null,
				matchHistory,
				events: Object.fromEntries(
					eventJobs.map(({ eventId, ...job }) => [eventId, job]),
				),
			};
		} catch {
			return {
				error:
					"Could not load image generation status. Refresh this page to try again.",
				events: {},
			} as const;
		}
	});

export const createMatchImage = createServerFn({ method: "POST" })
	.validator(MatchImageInputSchema)
	.handler(async ({ data }) => {
		try {
			return await submitCompletedMatchImage(
				getDb(),
				env.IMAGE_GENERATION_QUEUE,
				data.matchId,
			);
		} catch {
			return {
				error:
					"Could not confirm image submission. Wait a moment before trying again.",
			} as const;
		}
	});

export const selectMatchImage = createServerFn({ method: "POST" })
	.validator(MatchImageSelectionSchema)
	.handler(async ({ data }) => {
		try {
			return await selectActiveImageJob(
				getDb(),
				"match",
				data.matchId,
				data.jobId,
			);
		} catch {
			return {
				error:
					"Could not select that image. Choose a completed image for this match.",
			} as const;
		}
	});
