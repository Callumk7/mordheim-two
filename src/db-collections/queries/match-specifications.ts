import {
	type Collection,
	eq,
	type InitialQueryBuilder,
} from "@tanstack/react-db";
import type { Event } from "@/db/event";
import type { Match } from "@/db/match";
import type { Warband } from "@/db/warband";
import type { WarbandMatch } from "@/db/warband-match";
import type { Warrior } from "@/db/warrior";

type StringKeyedCollection<T extends object> = Collection<
	T,
	string,
	// biome-ignore lint/suspicious/noExplicitAny: Allows arbitrary collection utilities.
	any,
	// biome-ignore lint/suspicious/noExplicitAny: Allows arbitrary collection schemas.
	any,
	// biome-ignore lint/suspicious/noExplicitAny: Allows arbitrary collection insert inputs.
	any
>;

type MatchCollections = {
	matches: StringKeyedCollection<Match>;
};

type ParticipantCollections = {
	warbandMatches: StringKeyedCollection<WarbandMatch>;
	warbands: StringKeyedCollection<Warband>;
};

type RosterCollections = {
	warbandMatches: StringKeyedCollection<WarbandMatch>;
	warriors: StringKeyedCollection<Warrior>;
};

type EventCollections = {
	events: StringKeyedCollection<Event>;
	warbands: StringKeyedCollection<Warband>;
	warriors: StringKeyedCollection<Warrior>;
};

export function matchQuery({ matches }: MatchCollections, matchId: string) {
	return (q: InitialQueryBuilder) =>
		q.from({ match: matches }).where(({ match }) => eq(match.id, matchId));
}

export function matchParticipantsQuery(
	{ warbandMatches }: ParticipantCollections,
	matchId: string,
) {
	return (q: InitialQueryBuilder) =>
		q
			.from({ participant: warbandMatches })
			.where(({ participant }) => eq(participant.matchId, matchId));
}

export function allWarbandsQuery({ warbands }: ParticipantCollections) {
	return (q: InitialQueryBuilder) =>
		q.from({ warband: warbands }).orderBy(({ warband }) => warband.name);
}

export function matchRosterQuery(
	{ warbandMatches, warriors }: RosterCollections,
	matchId: string,
) {
	return (q: InitialQueryBuilder) =>
		q
			.from({ warrior: warriors })
			.innerJoin({ participant: warbandMatches }, ({ warrior, participant }) =>
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
			.orderBy(({ warrior }) => warrior.name);
}

export function matchEventsQuery(
	{ events, warbands, warriors }: EventCollections,
	matchId: string,
) {
	return (q: InitialQueryBuilder) =>
		q
			.from({ event: events })
			.where(({ event }) => eq(event.matchId, matchId))
			.innerJoin({ attacker: warbands }, ({ event, attacker }) =>
				eq(event.attackerWarbandId, attacker.id),
			)
			.innerJoin({ defender: warbands }, ({ event, defender }) =>
				eq(event.defenderWarbandId, defender.id),
			)
			.innerJoin({ attackerWarrior: warriors }, ({ event, attackerWarrior }) =>
				eq(event.attackerWarriorId, attackerWarrior.id),
			)
			.innerJoin({ defenderWarrior: warriors }, ({ event, defenderWarrior }) =>
				eq(event.defenderWarriorId, defenderWarrior.id),
			)
			.select(
				({ event, attacker, defender, attackerWarrior, defenderWarrior }) => ({
					id: event.id,
					matchId: event.matchId,
					attackerWarbandId: event.attackerWarbandId,
					attackerWarriorId: event.attackerWarriorId,
					defenderWarbandId: event.defenderWarbandId,
					defenderWarriorId: event.defenderWarriorId,
					notes: event.notes,
					outcome: event.outcome,
					resolvedAt: event.resolvedAt,
					voidedAt: event.voidedAt,
					voidReason: event.voidReason,
					isProcessed: event.isProcessed,
					createdAt: event.createdAt,
					updatedAt: event.updatedAt,
					attackerName: attacker.name,
					attackerWarriorName: attackerWarrior.name,
					defenderName: defender.name,
					defenderWarriorName: defenderWarrior.name,
				}),
			)
			.orderBy(({ event }) => event.createdAt, "desc");
}
