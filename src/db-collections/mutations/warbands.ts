import { type DbClient, safeRandomUUID } from "@tanstack/react-db";
import type { Warband } from "@/db/validation/warband";
import { deleteWarband } from "@/server/warbands";
import type { AppCollections } from "..";

type NewWarband = Omit<
	Warband,
	"id" | "isArchived" | "archivedAt" | "createdAt" | "updatedAt"
>;
type WarbandChanges = Partial<Omit<NewWarband, "campaignId">>;

export function createWarbandTransaction(
	collections: AppCollections,
	values: NewWarband,
) {
	const now = new Date().toISOString();
	return collections.warbands.insert({
		id: safeRandomUUID(),
		...values,
		isArchived: false,
		archivedAt: null,
		createdAt: now,
		updatedAt: now,
	});
}

export function updateWarbandTransaction(
	collections: AppCollections,
	warbandId: string,
	changes: WarbandChanges,
) {
	return collections.warbands.update(warbandId, (draft) => {
		Object.assign(draft, changes);
	});
}

export function setWarbandArchivedTransaction(
	collections: AppCollections,
	warbandId: string,
	isArchived: boolean,
	now: () => string = () => new Date().toISOString(),
) {
	return collections.warbands.update(warbandId, (draft) => {
		const timestamp = now();
		draft.isArchived = isArchived;
		draft.archivedAt = isArchived ? timestamp : null;
		draft.updatedAt = timestamp;
	});
}

export function deleteWarbandTransaction(
	dbClient: DbClient,
	collections: AppCollections,
	warbandId: string,
	input: { participantIds: string[]; warriorIds: string[]; eventIds: string[] },
) {
	const transaction = dbClient.createTransaction({
		mutationFn: async () => {
			await deleteWarband({ data: { id: warbandId } });
			await Promise.all([
				collections.warbands.utils.refetch(),
				collections.warriors.utils.refetch(),
				collections.warbandMatches.utils.refetch(),
				collections.events.utils.refetch(),
				collections.warriorEquipment.utils.refetch(),
				collections.warriorSkills.utils.refetch(),
			]);
		},
	});
	transaction.mutate(() => {
		if (input.eventIds.length > 0) collections.events.delete(input.eventIds);
		if (input.participantIds.length > 0) {
			collections.warbandMatches.delete(input.participantIds);
		}
		if (input.warriorIds.length > 0) {
			collections.warriors.delete(input.warriorIds);
		}
		collections.warbands.delete(warbandId);
	});
	return transaction;
}
