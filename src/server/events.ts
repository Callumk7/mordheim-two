import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
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
	.handler(({ data }) => operations.resolveEvent(getDb(), data));

export const voidEvent = createServerFn({ method: "POST" })
	.validator(EventVoidInputSchema)
	.handler(({ data }) => operations.voidEvent(getDb(), data));
