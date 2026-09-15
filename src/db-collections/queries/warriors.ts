import { type DbClient, useLiveQuery } from "@tanstack/react-db";
import { getCollections } from "../index";
import {
	warriorEventReferencesQuery,
	warriorQuery,
	warriorsQuery,
	warriorWarbandsQuery,
} from "./warrior-specifications";

export {
	warriorEventReferencesQuery,
	warriorQuery,
	warriorsQuery,
	warriorWarbandsQuery,
} from "./warrior-specifications";

export function useWarriors(dbClient: DbClient, showArchived = false) {
	const collections = getCollections(dbClient);
	const { data } = useLiveQuery({
		query: warriorsQuery(collections, showArchived),
	});
	return data;
}

export function useWarrior(dbClient: DbClient, warriorId: string) {
	const collections = getCollections(dbClient);
	const { data } = useLiveQuery({
		query: warriorQuery(collections, warriorId),
	});
	return data[0];
}

export function useWarriorEventReferences(
	dbClient: DbClient,
	warriorId: string,
) {
	const collections = getCollections(dbClient);
	const { data } = useLiveQuery({
		query: warriorEventReferencesQuery(collections, warriorId),
	});
	return data;
}

export function useWarriorWarbands(dbClient: DbClient, showArchived = false) {
	const collections = getCollections(dbClient);
	const { data } = useLiveQuery({
		query: warriorWarbandsQuery(collections, showArchived),
	});
	return data;
}

export function useWarriorsIndex(dbClient: DbClient, showArchived = false) {
	return {
		warbands: useWarriorWarbands(dbClient, showArchived),
		warriors: useWarriors(dbClient, showArchived),
	};
}

export function useWarriorDetails(dbClient: DbClient, warriorId: string) {
	return {
		eventReferences: useWarriorEventReferences(dbClient, warriorId),
		warbands: useWarriorWarbands(dbClient, true),
		warrior: useWarrior(dbClient, warriorId),
	};
}

export function useWarriorDeletion(dbClient: DbClient, warriorId: string) {
	const eventReferences = useWarriorEventReferences(dbClient, warriorId);
	return {
		eventIds: eventReferences.map((event) => event.id),
		warrior: useWarrior(dbClient, warriorId),
	};
}
