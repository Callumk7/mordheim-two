import { type DbClient, useLiveQuery } from "@tanstack/react-db";
import { getCollections } from "../index";
import { projectMatchWorkspace } from "../projections";
import {
	allWarbandsQuery,
	matchEventsQuery,
	matchParticipantsQuery,
	matchQuery,
	matchRosterQuery,
} from "./match-specifications";

export {
	allWarbandsQuery,
	matchEventsQuery,
	matchParticipantsQuery,
	matchQuery,
	matchRosterQuery,
} from "./match-specifications";

export function useMatch(dbClient: DbClient, matchId: string) {
	const collections = getCollections(dbClient);
	const { data } = useLiveQuery({ query: matchQuery(collections, matchId) });
	return data[0];
}

export function useMatchParticipants(dbClient: DbClient, matchId: string) {
	const collections = getCollections(dbClient);
	const { data: participants } = useLiveQuery({
		query: matchParticipantsQuery(collections, matchId),
	});
	const { data: allWarbands } = useLiveQuery({
		query: allWarbandsQuery(collections),
	});
	return { allWarbands, participants };
}

export function useMatchRoster(dbClient: DbClient, matchId: string) {
	const collections = getCollections(dbClient);
	const { data } = useLiveQuery({
		query: matchRosterQuery(collections, matchId),
	});
	return data;
}

export function useMatchEvents(dbClient: DbClient, matchId: string) {
	const collections = getCollections(dbClient);
	const { data } = useLiveQuery({
		query: matchEventsQuery(collections, matchId),
	});
	return data;
}

export function useMatchWorkspace(dbClient: DbClient, matchId: string) {
	const match = useMatch(dbClient, matchId);
	const { allWarbands, participants } = useMatchParticipants(dbClient, matchId);
	const warriors = useMatchRoster(dbClient, matchId);
	const events = useMatchEvents(dbClient, matchId);

	return projectMatchWorkspace({
		allWarbands,
		events,
		match,
		participants,
		warriors,
	});
}
