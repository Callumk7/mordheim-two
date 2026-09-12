import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import {
	queryMatchEventImages,
	queryMatchImage,
} from "@/db/operations/match-images.server";
import { MatchImageInputSchema } from "@/db/validation/match";

// Unauthenticated spike RPC: protect this with the rest of the image-generation
// surface before enabling paid generation or exposing private campaign data.
export const getMatchImagery = createServerFn({ method: "GET" })
	.validator(MatchImageInputSchema)
	.handler(async ({ data }) => {
		try {
			const db = getDb();
			const [match, eventJobs] = await Promise.all([
				queryMatchImage(db, data.matchId),
				queryMatchEventImages(db, data.matchId),
			]);
			return {
				match: match ?? null,
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
