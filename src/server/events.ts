import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import { submitEventImage } from "@/db/operations/event-images.server";
import * as operations from "@/db/operations/events.server";
import {
	EventCreateSchema,
	EventFactUpdateInputSchema,
	EventResolutionInputSchema,
	EventVoidInputSchema,
} from "@/db/validation/event";

export const listEvents = createServerFn({ method: "GET" }).handler(() =>
	operations.listEvents(getDb()),
);

export const createEvent = createServerFn({ method: "POST" })
	.validator(EventCreateSchema)
	.handler(({ data }) => operations.createEvent(getDb(), data));

export const updateEvent = createServerFn({ method: "POST" })
	.validator(EventFactUpdateInputSchema)
	.handler(({ data }) => operations.updateEvent(getDb(), data));

export const resolveEvent = createServerFn({ method: "POST" })
	.validator(EventResolutionInputSchema)
	.handler(async ({ data }) => {
		const db = getDb();
		await operations.resolveEvent(db, data);
		if (data.outcome === "Injury" || data.outcome === "Death") {
			// Resolution is the durable source of truth. Image generation is a related
			// best-effort side effect, so a post-resolution infrastructure failure must
			// not make the client retry an immutable event resolution.
			try {
				await submitEventImage(db, env.IMAGE_GENERATION_QUEUE, data.id);
			} catch {
				// Queue send failures are recorded on the job by the producer. A rarer D1
				// failure before job creation remains visible as a missing event image.
				console.error("Event image submission failed after resolution.", {
					eventId: data.id,
				});
			}
		}
	});

export const voidEvent = createServerFn({ method: "POST" })
	.validator(EventVoidInputSchema)
	.handler(({ data }) => operations.voidEvent(getDb(), data));
