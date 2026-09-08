import { safeRandomUUID } from "@tanstack/react-db";
import type { EventInput, EventOutcome } from "@/db/event";
import type { AppCollections } from "..";

type NewEvent = Omit<
	EventInput,
	| "id"
	| "createdAt"
	| "updatedAt"
	| "outcome"
	| "resolvedAt"
	| "voidedAt"
	| "voidReason"
	| "isProcessed"
>;
type EventChanges = Partial<NewEvent>;

export function createEventTransaction(
	collections: AppCollections,
	values: NewEvent,
) {
	const now = new Date().toISOString();
	return collections.events.insert({
		id: safeRandomUUID(),
		...values,
		outcome: null,
		resolvedAt: null,
		voidedAt: null,
		voidReason: null,
		isProcessed: false,
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

export function setEventOutcomeTransaction(
	collections: AppCollections,
	eventId: string,
	outcome: EventOutcome,
) {
	return collections.events.update(eventId, { optimistic: false }, (draft) => {
		draft.outcome = outcome;
		draft.resolvedAt = new Date().toISOString();
		draft.isProcessed = true;
	});
}

export function voidEventTransaction(
	collections: AppCollections,
	eventId: string,
	reason: string,
) {
	const trimmedReason = reason.trim();
	if (!trimmedReason) throw new Error("A reason is required to void an event.");
	return collections.events.update(eventId, { optimistic: false }, (draft) => {
		draft.voidedAt = new Date().toISOString();
		draft.voidReason = trimmedReason;
	});
}

/** Void-and-replace correction. The replacement is always a new unresolved fact. */
export async function correctEvent(
	collections: AppCollections,
	eventId: string,
	reason: string,
	replacement: NewEvent,
) {
	const voiding = voidEventTransaction(collections, eventId, reason);
	await voiding.isPersisted.promise;
	return createEventTransaction(collections, replacement);
}

/** @deprecated Historical events must be voided, not deleted. */
export function deleteEventTransaction(
	collections: AppCollections,
	eventId: string,
) {
	return voidEventTransaction(collections, eventId, "Voided by user");
}
