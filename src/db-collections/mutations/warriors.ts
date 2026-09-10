import { type DbClient, safeRandomUUID } from "@tanstack/react-db";
import { useCallback } from "react";
import type { Warrior } from "@/db/validation/warrior";
import { deleteWarrior } from "@/server/warriors";
import { type AppCollections, getCollections } from "..";

export type NewWarrior = Omit<Warrior, "id" | "createdAt" | "updatedAt">;
export type WarriorChanges = Partial<NewWarrior>;

export function createWarriorTransaction(
	collections: AppCollections,
	values: NewWarrior,
) {
	const now = new Date().toISOString();
	return collections.warriors.insert({
		id: safeRandomUUID(),
		...values,
		createdAt: now,
		updatedAt: now,
	});
}

export function updateWarriorTransaction(
	collections: AppCollections,
	warriorId: string,
	changes: WarriorChanges,
) {
	return collections.warriors.update(warriorId, (draft) => {
		Object.assign(draft, changes);
	});
}

export function deleteWarriorTransaction(
	dbClient: DbClient,
	collections: AppCollections,
	warriorId: string,
	eventIds: string[],
) {
	const transaction = dbClient.createTransaction({
		mutationFn: async () => {
			await deleteWarrior({ data: { id: warriorId } });
			await Promise.all([
				collections.warriors.utils.refetch(),
				collections.events.utils.refetch(),
				collections.warriorEquipment.utils.refetch(),
			]);
		},
	});
	transaction.mutate(() => {
		if (eventIds.length > 0) collections.events.delete(eventIds);
		collections.warriors.delete(warriorId);
	});
	return transaction;
}

export function useWarriorMutations(dbClient: DbClient) {
	const createWarrior = useCallback(
		async (values: NewWarrior) => {
			const transaction = createWarriorTransaction(
				getCollections(dbClient),
				values,
			);
			await transaction.isPersisted.promise;
		},
		[dbClient],
	);
	const updateWarrior = useCallback(
		async (warriorId: string, changes: WarriorChanges) => {
			const transaction = updateWarriorTransaction(
				getCollections(dbClient),
				warriorId,
				changes,
			);
			await transaction.isPersisted.promise;
		},
		[dbClient],
	);
	const removeWarrior = useCallback(
		async (warriorId: string, eventIds: string[]) => {
			const collections = getCollections(dbClient);
			const transaction = deleteWarriorTransaction(
				dbClient,
				collections,
				warriorId,
				eventIds,
			);
			await transaction.isPersisted.promise;
		},
		[dbClient],
	);

	return { createWarrior, removeWarrior, updateWarrior };
}
