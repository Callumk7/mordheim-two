import { type DbClient, eq, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import { getCollections } from "@/db-collections";
import { projectWarbandDashboard } from "@/db-collections/projections";

export function useWarbandDashboard(
	dbClient: DbClient,
	campaignId: string,
	warbandId: string,
) {
	const { events, matches, warbandMatches, warbands, warriors } =
		getCollections(dbClient);
	const { data: eventRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ event: events })
				.where(({ event }) => eq(event.campaignId, campaignId)),
	});
	const { data: matchRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ match: matches })
				.where(({ match }) => eq(match.campaignId, campaignId)),
	});
	const { data: participantRows } = useLiveQuery({
		query: (q) => q.from({ participant: warbandMatches }),
	});
	const { data: warbandRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbands })
				.where(({ warband }) => eq(warband.campaignId, campaignId)),
	});
	const { data: warriorRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ warrior: warriors })
				.where(({ warrior }) => eq(warrior.campaignId, campaignId)),
	});

	return useMemo(
		() =>
			projectWarbandDashboard({
				warbandId,
				warbands: warbandRows,
				warriors: warriorRows,
				matches: matchRows,
				participants: participantRows,
				events: eventRows,
			}),
		[
			warbandId,
			warbandRows,
			warriorRows,
			matchRows,
			participantRows,
			eventRows,
		],
	);
}
