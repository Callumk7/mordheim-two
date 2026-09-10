import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import { queryEventImage } from "@/db/operations/event-images.server";
import { EventImageInputSchema } from "@/db/validation/event";

// Unauthenticated spike RPC: protect this with the rest of the image-generation
// surface before enabling paid generation or exposing private campaign data.
export const getEventImage = createServerFn({ method: "GET" })
	.validator(EventImageInputSchema)
	.handler(async ({ data }) => {
		try {
			return {
				job: (await queryEventImage(getDb(), data.eventId)) ?? null,
			};
		} catch {
			return {
				error:
					"Could not load event image status. Refresh this page to try again.",
			} as const;
		}
	});
