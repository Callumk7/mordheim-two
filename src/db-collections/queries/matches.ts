import { type DbClient, eq, useLiveQuery } from "@tanstack/react-db";
import { getCollections } from "../index";
import { projectMatchWorkspace } from "../projections";

export function useMatch(dbClient: DbClient, matchId: string) {
	const { matches } = getCollections(dbClient);
	const { data } = useLiveQuery({
		query: (q) =>
			q.from({ match: matches }).where(({ match }) => eq(match.id, matchId)),
	});

	return data[0];
}

export function useMatchParticipants(dbClient: DbClient, matchId: string) {
	const { warbandMatches, warbands } = getCollections(dbClient);
	const { data: participants } = useLiveQuery({
		query: (q) =>
			q
				.from({ participant: warbandMatches })
				.where(({ participant }) => eq(participant.matchId, matchId)),
	});
	const { data: allWarbands } = useLiveQuery({
		query: (q) =>
			q.from({ warband: warbands }).orderBy(({ warband }) => warband.name),
	});
	return { allWarbands, participants };
}

export function useMatchRoster(dbClient: DbClient, matchId: string) {
	const { warbandMatches, warriors } = getCollections(dbClient);
	const { data } = useLiveQuery({
		query: (q) =>
			q
				.from({ warrior: warriors })
				.innerJoin(
					{ participant: warbandMatches },
					({ warrior, participant }) =>
						eq(warrior.warbandId, participant.warbandId),
				)
				.where(({ participant }) => eq(participant.matchId, matchId))
				.select(({ warrior }) => ({
					id: warrior.id,
					name: warrior.name,
					class: warrior.class,
					status: warrior.status,
					warbandId: warrior.warbandId,
					knocked: warrior.knocked,
					injuries: warrior.injuries,
					knockedDowns: warrior.knockedDowns,
					createdAt: warrior.createdAt,
					updatedAt: warrior.updatedAt,
				}))
				.orderBy(({ warrior }) => warrior.name),
	});

	return data;
}

export function useMatchEvents(dbClient: DbClient, matchId: string) {
	const { events, warbands, warriors } = getCollections(dbClient);
	const { data } = useLiveQuery({
		query: (q) =>
			q
				.from({ event: events })
				.where(({ event }) => eq(event.matchId, matchId))
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
						attackerName: attacker.name,
						attackerWarriorName: attackerWarrior.name,
						defenderName: defender.name,
						defenderWarriorName: defenderWarrior.name,
					}),
				)
				.orderBy(({ event }) => event.createdAt, "desc"),
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
