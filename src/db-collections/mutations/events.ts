import { safeRandomUUID } from "@tanstack/react-db";
import type { Event } from "@/db/event";
import type { AppCollections } from "..";

type NewEvent = Omit<Event, "id" | "createdAt" | "updatedAt">;
type EventChanges = Partial<NewEvent>;

export function createEventTransaction(
	collections: AppCollections,
	values: NewEvent,
) {
	const now = new Date().toISOString();
	return collections.events.insert({
		id: safeRandomUUID(),
		...values,
		createdAt: now,
		updatedAt: now,
	});
}

export function updateEventTransaction(
	collections: AppCollections,
	eventId: string,
	changes: EventChanges,
) {
	return collections.events.update(eventId, (draft) => {
		Object.assign(draft, changes);
	});
}

export function deleteEventTransaction(
	collections: AppCollections,
	eventId: string,
) {
	return collections.events.delete(eventId);
}
