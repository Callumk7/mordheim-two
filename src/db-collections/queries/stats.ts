import { type DbClient, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import { getCollections } from "@/db-collections";
import {
	projectMatchResults,
	projectStatsDashboard,
} from "@/db-collections/projections";
import { useCombatStats } from "@/db-collections/queries/combat-stats";

export function useStatsDashboard(dbClient: DbClient) {
	const {
		matches: matchesCollection,
		warbandMatches: warbandMatchesCollection,
		warbands: warbandsCollection,
		warriors: warriorsCollection,
	} = getCollections(dbClient);
	const combatStats = useCombatStats(dbClient);
	const { data: matches } = useLiveQuery({
		query: (q) => q.from({ match: matchesCollection }),
	});
	const { data: participants } = useLiveQuery({
		query: (q) => q.from({ participant: warbandMatchesCollection }),
	});
	const { data: warbands } = useLiveQuery({
		query: (q) => q.from({ warband: warbandsCollection }),
	});
	const { data: warriors } = useLiveQuery({
		query: (q) => q.from({ warrior: warriorsCollection }),
	});

	return useMemo(
		() => ({
			...projectStatsDashboard({ warbands, warriors, combatStats }),
			...projectMatchResults({ matches, participants, warbands }),
		}),
		[warbands, warriors, matches, participants, combatStats],
	);
}
