import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { BasicIndex, collectionOptions } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import {
	EventCreateSchema,
	EventFactUpdateSchema,
	EventSchema,
} from "@/db/event";
import {
	createEvent,
	listEvents,
	resolveEvent,
	updateEvent,
	voidEvent,
} from "@/db/events.functions";

export const eventsCollectionOptions = collectionOptions("events", (client) =>
	queryCollectionOptions({
		id: "events",
		autoIndex: "eager",
		defaultIndexType: BasicIndex,
		queryKey: ["events"],
		queryClient: client.requireDependency<QueryClient>("queryClient"),
		queryFn: () => listEvents(),
		getKey: (event) => event.id,
		schema: EventSchema,
		onInsert: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map((mutation) =>
					createEvent({ data: EventCreateSchema.parse(mutation.modified) }),
				),
			);
		},
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map((mutation) => {
					const changes = mutation.changes;
					if (changes.voidedAt !== undefined) {
						return voidEvent({
							data: {
								id: mutation.original.id,
								reason: String(changes.voidReason ?? "Voided by user"),
							},
						});
					}
					if (changes.outcome !== undefined) {
						if (changes.outcome === null) {
							throw new Error("Resolved events cannot be made unresolved.");
						}
						return resolveEvent({
							data: { id: mutation.original.id, outcome: changes.outcome },
						});
					}
					return updateEvent({
						data: {
							id: mutation.original.id,
							changes: EventFactUpdateSchema.parse(changes),
						},
					});
				}),
			);
		},
		onDelete: () => {
			throw new Error("Events are historical facts. Void them instead.");
		},
	}),
);
