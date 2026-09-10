import type { Event } from "@/db/validation/event";
import { isEffectiveEvent } from "@/db/validation/event";
import type { Match } from "@/db/validation/match";
import type { Warband } from "@/db/validation/warband";
import type { WarbandMatch } from "@/db/validation/warband-match";
import type { Warrior } from "@/db/validation/warrior";
import { buildCombatLeaderboard } from "./combat-leaderboard";
import { getWarriorCombatStats, projectCombatStats } from "./combat-stats";

export type WarbandMatchOutcome = "Win" | "Loss" | "Draw" | "Pending";

export interface WarbandMatchRow extends Match {
	outcome: WarbandMatchOutcome;
}

export interface WarbandEventRow extends Event {
	attackerName: string;
	attackerWarriorName: string;
	defenderName: string;
	defenderWarriorName: string;
	matchName: string;
}

export interface GraveyardRow extends Warrior {
	deathAt: string | null;
	killerName: string | null;
	matchId: string | null;
	matchName: string | null;
}

export interface WarbandDashboardProjectionInput {
	warbandId: string;
	warbands: readonly Warband[];
	warriors: readonly Warrior[];
	matches: readonly Match[];
	participants: readonly WarbandMatch[];
	events: readonly Event[];
}

export function projectWarbandDashboard({
	warbandId,
	warbands,
	warriors,
	matches,
	participants,
	events,
}: WarbandDashboardProjectionInput) {
	const warbandById = new Map(warbands.map((warband) => [warband.id, warband]));
	const warriorById = new Map(warriors.map((warrior) => [warrior.id, warrior]));
	const matchById = new Map(matches.map((match) => [match.id, match]));
	const combatStats = projectCombatStats(events);
	const roster = warriors.filter((warrior) => warrior.warbandId === warbandId);
	const deadIds = new Set(
		roster
			.filter(
				(warrior) =>
					warrior.status === "Dead" ||
					getWarriorCombatStats(combatStats, warrior.id).isDead,
			)
			.map((warrior) => warrior.id),
	);

	const relatedEvents = events
		.filter(
			(event) =>
				event.attackerWarbandId === warbandId ||
				event.defenderWarbandId === warbandId,
		)
		.sort((a, b) => compareNewest(a.createdAt, b.createdAt))
		.map<WarbandEventRow>((event) => ({
			...event,
			attackerName:
				warbandById.get(event.attackerWarbandId)?.name ?? "Unknown warband",
			attackerWarriorName:
				warriorById.get(event.attackerWarriorId)?.name ?? "Unknown warrior",
			defenderName:
				warbandById.get(event.defenderWarbandId)?.name ?? "Unknown warband",
			defenderWarriorName:
				warriorById.get(event.defenderWarriorId)?.name ?? "Unknown warrior",
			matchName: matchById.get(event.matchId)?.name ?? "Unknown match",
		}));

	const participantMatchIds = new Set(
		participants
			.filter((participant) => participant.warbandId === warbandId)
			.map((participant) => participant.matchId),
	);
	const matchRows = matches
		.filter((match) => participantMatchIds.has(match.id))
		.map<WarbandMatchRow>((match) => ({
			...match,
			outcome:
				match.result === "Draw"
					? "Draw"
					: match.result === "Pending"
						? "Pending"
						: match.winnerWarbandId === warbandId
							? "Win"
							: "Loss",
		}))
		.sort((a, b) => compareNewest(a.createdAt, b.createdAt));
	const completedMatches = matchRows.filter(
		(match) => match.outcome !== "Pending",
	);
	const wins = completedMatches.filter(
		(match) => match.outcome === "Win",
	).length;
	const losses = completedMatches.filter(
		(match) => match.outcome === "Loss",
	).length;
	const draws = completedMatches.filter(
		(match) => match.outcome === "Draw",
	).length;

	const graveyard = roster
		.filter((warrior) => deadIds.has(warrior.id))
		.map<GraveyardRow>((warrior) => {
			const death = relatedEvents.find(
				(event) =>
					event.defenderWarriorId === warrior.id &&
					event.outcome === "Death" &&
					isEffectiveEvent(event),
			);
			return {
				...warrior,
				deathAt: death?.resolvedAt ?? null,
				killerName: death?.attackerWarriorName ?? null,
				matchId: death?.matchId ?? null,
				matchName: death?.matchName ?? null,
			};
		})
		.sort((a, b) =>
			a.deathAt && b.deathAt
				? compareNewest(a.deathAt, b.deathAt)
				: a.deathAt
					? -1
					: b.deathAt
						? 1
						: a.name.localeCompare(b.name),
		);

	return {
		combatStats,
		events: relatedEvents,
		graveyard,
		livingRoster: roster.filter((warrior) => !deadIds.has(warrior.id)),
		matches: matchRows,
		matchStats: {
			played: completedMatches.length,
			wins,
			losses,
			draws,
			winRate:
				completedMatches.length === 0
					? 0
					: Math.round((wins / completedMatches.length) * 100),
		},
		warriorLeaderboard: buildCombatLeaderboard(roster, combatStats.warriors),
	};
}

function compareNewest(a: string, b: string) {
	return b.localeCompare(a);
}

export type WarbandDashboard = ReturnType<typeof projectWarbandDashboard>;
