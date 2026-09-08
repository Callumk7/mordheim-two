import { type DbClient, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import { getCollections } from "@/db-collections";
import { projectCombatStats } from "@/db-collections/projections";

export function useCombatStats(dbClient: DbClient) {
	const { events } = getCollections(dbClient);
	const { data } = useLiveQuery({ query: (q) => q.from({ event: events }) });
	return useMemo(() => projectCombatStats(data), [data]);
}
