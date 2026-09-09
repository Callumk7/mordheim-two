import type { DbClient } from "@tanstack/react-db";
import { equipmentCollectionOptions } from "./equipment";
import { eventsCollectionOptions } from "./events";
import { matchesCollectionOptions } from "./matches";
import { warbandMatchesCollectionOptions } from "./warband-matches";
import { warbandsCollectionOptions } from "./warbands";
import { warriorEquipmentCollectionOptions } from "./warrior-equipment";
import { warriorsCollectionOptions } from "./warriors";

export function getCollections(dbClient: DbClient) {
	return {
		equipment: dbClient.collection(equipmentCollectionOptions),
		events: dbClient.collection(eventsCollectionOptions),
		matches: dbClient.collection(matchesCollectionOptions),
		warbandMatches: dbClient.collection(warbandMatchesCollectionOptions),
		warbands: dbClient.collection(warbandsCollectionOptions),
		warriorEquipment: dbClient.collection(warriorEquipmentCollectionOptions),
		warriors: dbClient.collection(warriorsCollectionOptions),
	};
}

export type AppCollections = ReturnType<typeof getCollections>;
