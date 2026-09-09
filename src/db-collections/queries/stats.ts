import { type DbClient, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import { getCollections } from "@/db-collections";
import { projectStatsDashboard } from "@/db-collections/projections";
import { useCombatStats } from "@/db-collections/queries/combat-stats";

export function useStatsDashboard(dbClient: DbClient) {
	const { warbands: warbandsCollection, warriors: warriorsCollection } =
		getCollections(dbClient);
	const combatStats = useCombatStats(dbClient);
	const { data: warbands } = useLiveQuery({
		query: (q) => q.from({ warband: warbandsCollection }),
	});
	const { data: warriors } = useLiveQuery({
		query: (q) => q.from({ warrior: warriorsCollection }),
	});

	return useMemo(
		() => projectStatsDashboard({ warbands, warriors, combatStats }),
		[warbands, warriors, combatStats],
	);
}
