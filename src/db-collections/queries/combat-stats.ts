import { type DbClient, eq, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import { getCollections } from "@/db-collections";
import { projectCombatStats } from "@/db-collections/projections";

export function useCombatStats(dbClient: DbClient, campaignId: string) {
	const { events, warriors } = getCollections(dbClient);
	const { data: eventRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ event: events })
				.where(({ event }) => eq(event.campaignId, campaignId)),
	});
	const { data: warriorRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ warrior: warriors })
				.where(({ warrior }) => eq(warrior.campaignId, campaignId)),
	});
	return useMemo(
		() => projectCombatStats(eventRows, warriorRows),
		[eventRows, warriorRows],
	);
}
