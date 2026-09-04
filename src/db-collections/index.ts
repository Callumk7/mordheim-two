import type { DbClient } from "@tanstack/react-db";
import { eventsCollectionOptions } from "./events";
import { matchesCollectionOptions } from "./matches";
import { warbandMatchesCollectionOptions } from "./warband-matches";
import { warbandsCollectionOptions } from "./warbands";
import { warriorsCollectionOptions } from "./warriors";

export function getCollections(dbClient: DbClient) {
	return {
		events: dbClient.collection(eventsCollectionOptions),
		matches: dbClient.collection(matchesCollectionOptions),
		warbandMatches: dbClient.collection(warbandMatchesCollectionOptions),
		warbands: dbClient.collection(warbandsCollectionOptions),
		warriors: dbClient.collection(warriorsCollectionOptions),
	};
}

export type AppCollections = ReturnType<typeof getCollections>;
