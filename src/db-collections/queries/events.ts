import { type DbClient, eq, useLiveQuery } from "@tanstack/react-db";
import { getCollections } from "..";

export function useEvents(dbClient: DbClient) {
	const collections = getCollections(dbClient);
	const { events, matches, warbands, warriors } = collections;

	const { data: eventRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ event: events })
				.innerJoin({ match: matches }, ({ event, match }) =>
					eq(event.matchId, match.id),
				)
				.innerJoin({ attacker: warbands }, ({ event, attacker }) =>
					eq(event.attackerWarbandId, attacker.id),
				)
				.innerJoin({ defender: warbands }, ({ event, defender }) =>
					eq(event.defenderWarbandId, defender.id),
				)
				.innerJoin(
					{ attackerWarrior: warriors },
					({ event, attackerWarrior }) =>
						eq(event.attackerWarriorId, attackerWarrior.id),
				)
				.innerJoin(
					{ defenderWarrior: warriors },
					({ event, defenderWarrior }) =>
						eq(event.defenderWarriorId, defenderWarrior.id),
				)
				.select(
					({
						event,
						match,
						attacker,
						defender,
						attackerWarrior,
						defenderWarrior,
					}) => ({
						id: event.id,
						matchId: event.matchId,
						attackerWarbandId: event.attackerWarbandId,
						attackerWarriorId: event.attackerWarriorId,
						defenderWarbandId: event.defenderWarbandId,
						defenderWarriorId: event.defenderWarriorId,
						notes: event.notes,
						createdAt: event.createdAt,
						updatedAt: event.updatedAt,
						matchName: match.name,
						attackerName: attacker.name,
						attackerWarriorName: attackerWarrior.name,
						defenderName: defender.name,
						defenderWarriorName: defenderWarrior.name,
					}),
				)
				.orderBy(({ event }) => event.createdAt, "desc"),
	});

	return eventRows;
}
