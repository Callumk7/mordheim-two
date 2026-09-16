import type { DbClient } from "@tanstack/react-db";
import { campaignsCollectionOptions } from "./campaigns";
import { equipmentCollectionOptions } from "./equipment";
import { eventsCollectionOptions } from "./events";
import { matchesCollectionOptions } from "./matches";
import { skillsCollectionOptions } from "./skills";
import { warbandMatchesCollectionOptions } from "./warband-matches";
import { warbandsCollectionOptions } from "./warbands";
import { warriorEquipmentCollectionOptions } from "./warrior-equipment";
import { warriorSkillsCollectionOptions } from "./warrior-skills";
import { warriorsCollectionOptions } from "./warriors";

export function getCollections(dbClient: DbClient) {
	return {
		campaigns: dbClient.collection(campaignsCollectionOptions),
		equipment: dbClient.collection(equipmentCollectionOptions),
		events: dbClient.collection(eventsCollectionOptions),
		matches: dbClient.collection(matchesCollectionOptions),
		skills: dbClient.collection(skillsCollectionOptions),
		warbandMatches: dbClient.collection(warbandMatchesCollectionOptions),
		warbands: dbClient.collection(warbandsCollectionOptions),
		warriorEquipment: dbClient.collection(warriorEquipmentCollectionOptions),
		warriorSkills: dbClient.collection(warriorSkillsCollectionOptions),
		warriors: dbClient.collection(warriorsCollectionOptions),
	};
}

export type AppCollections = ReturnType<typeof getCollections>;
