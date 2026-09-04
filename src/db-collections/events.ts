import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { collectionOptions } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { EventSchema, EventUpdateSchema } from "@/db/event";
import {
	createEvent,
	deleteEvent,
	listEvents,
	updateEvent,
} from "@/db/events.functions";

export const eventsCollectionOptions = collectionOptions("events", (client) =>
	queryCollectionOptions({
		id: "events",
		queryKey: ["events"],
		queryClient: client.requireDependency<QueryClient>("queryClient"),
		queryFn: () => listEvents(),
		getKey: (event) => event.id,
		schema: EventSchema,
		onInsert: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map((mutation) =>
					createEvent({ data: EventSchema.parse(mutation.modified) }),
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
