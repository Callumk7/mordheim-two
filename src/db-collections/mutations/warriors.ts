import { type DbClient, safeRandomUUID } from "@tanstack/react-db";
import type { Warrior } from "@/db/warrior";
import { deleteWarrior } from "@/db/warriors.functions";
import type { AppCollections } from "..";

type NewWarrior = Omit<Warrior, "id" | "createdAt" | "updatedAt">;
type WarriorChanges = Partial<NewWarrior>;

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
			]);
		},
	});
	transaction.mutate(() => {
		if (eventIds.length > 0) collections.events.delete(eventIds);
		collections.warriors.delete(warriorId);
	});
	return transaction;
}
