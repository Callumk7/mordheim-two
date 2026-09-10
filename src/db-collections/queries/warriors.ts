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

export function useWarriors(dbClient: DbClient) {
	const collections = getCollections(dbClient);
	const { data } = useLiveQuery({ query: warriorsQuery(collections) });
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

export function useWarriorWarbands(dbClient: DbClient) {
	const collections = getCollections(dbClient);
	const { data } = useLiveQuery({
		query: warriorWarbandsQuery(collections),
	});
	return data;
}

export function useWarriorsIndex(dbClient: DbClient) {
	return {
		warbands: useWarriorWarbands(dbClient),
		warriors: useWarriors(dbClient),
	};
}

export function useWarriorDetails(dbClient: DbClient, warriorId: string) {
	return {
		eventReferences: useWarriorEventReferences(dbClient, warriorId),
		warbands: useWarriorWarbands(dbClient),
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
