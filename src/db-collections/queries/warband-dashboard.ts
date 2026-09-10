import { type DbClient, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import { getCollections } from "@/db-collections";
import { projectWarbandDashboard } from "@/db-collections/projections";

export function useWarbandDashboard(dbClient: DbClient, warbandId: string) {
	const { events, matches, warbandMatches, warbands, warriors } =
		getCollections(dbClient);
	const { data: eventRows } = useLiveQuery({
		query: (q) => q.from({ event: events }),
	});
	const { data: matchRows } = useLiveQuery({
		query: (q) => q.from({ match: matches }),
	});
	const { data: participantRows } = useLiveQuery({
		query: (q) => q.from({ participant: warbandMatches }),
	});
	const { data: warbandRows } = useLiveQuery({
		query: (q) => q.from({ warband: warbands }),
	});
	const { data: warriorRows } = useLiveQuery({
		query: (q) => q.from({ warrior: warriors }),
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
