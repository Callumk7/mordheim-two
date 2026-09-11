import { type DbClient, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import { getCollections } from "@/db-collections";
import { projectCombatStats } from "@/db-collections/projections";

export function useCombatStats(dbClient: DbClient) {
	const { events, warriors } = getCollections(dbClient);
	const { data: eventRows } = useLiveQuery({
		query: (q) => q.from({ event: events }),
	});
	const { data: warriorRows } = useLiveQuery({
		query: (q) => q.from({ warrior: warriors }),
	});
	return useMemo(
		() => projectCombatStats(eventRows, warriorRows),
		[eventRows, warriorRows],
	);
}
