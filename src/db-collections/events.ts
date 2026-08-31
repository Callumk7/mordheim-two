import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { type Event, EventSchema, EventUpdateSchema } from "../db/event";
import {
	createEvent,
	deleteEvent,
	listEvents,
	updateEvent,
} from "../db/events.functions";

function createEventsCollection(queryClient: QueryClient) {
	return createCollection(
		queryCollectionOptions({
			id: "events",
			queryKey: ["events"],
			queryClient,
			queryFn: () => listEvents(),
			getKey: (event) => event.id,
			schema: EventSchema,
			onInsert: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						createEvent({
							data: EventSchema.parse(mutation.modified),
						}),
					),
				);
			},
			onUpdate: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						updateEvent({
							data: {
								id: mutation.original.id,
								changes: EventUpdateSchema.parse(mutation.changes),
							},
						}),
					),
				);
			},
			onDelete: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						deleteEvent({ data: { id: mutation.original.id } }),
					),
				);
			},
		}),
	);
}

export type EventsCollection = ReturnType<typeof createEventsCollection>;

const collections = new WeakMap<QueryClient, EventsCollection>();

export function getEventsCollection(queryClient: QueryClient) {
	const existingCollection = collections.get(queryClient);
	if (existingCollection) return existingCollection;

	const collection = createEventsCollection(queryClient);
	collections.set(queryClient, collection);
	return collection;
}

export type { Event };
