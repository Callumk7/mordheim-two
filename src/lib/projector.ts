import type { Event } from "@/db/validation/event";
import type { Match } from "@/db/validation/match";
import type { Warband } from "@/db/validation/warband";
import type { WarbandMatch } from "@/db/validation/warband-match";
import type { Warrior } from "@/db/validation/warrior";
import {
	getWarriorCombatStats,
	projectCombatStats,
	type WarriorCombatStats,
} from "@/db-collections/projections/combat-stats";

export const DEFAULT_ROTATION_SECONDS = 12;
export const MIN_ROTATION_SECONDS = 5;
export const MAX_ROTATION_SECONDS = 60;

export type ProjectorInput = {
	events: readonly Event[];
	matches: readonly Match[];
	participants: readonly WarbandMatch[];
	warbands: readonly Warband[];
	warriors: readonly Warrior[];
};

export type ProjectorWarrior = Warrior & {
	combat: WarriorCombatStats;
	warbandName: string;
	effectiveStatus: Warrior["status"];
};

export type ProjectorMatch = Match & {
	participantNames: string[];
	winnerName: string | null;
};

export type ProjectorHighlight = {
	id: string;
	phase: "Knockdown" | "Injury" | "Death";
	matchId: string;
	matchName: string;
	attackerName: string;
	defenderId: string;
	defenderName: string;
	createdAt: string;
	resolvedAt: string | null;
};

export type ProjectorData = {
	standings: Warband[];
	warriors: ProjectorWarrior[];
	matches: {
		live: ProjectorMatch[];
		scheduled: ProjectorMatch[];
		recent: ProjectorMatch[];
	};
	highlights: ProjectorHighlight[];
	ticker: string[];
};

export type BreakingAlert = ProjectorHighlight;

export function parseRotationSeconds(value: unknown) {
	// Router's JSON search parser supplies numbers for unquoted query values.
	const parsed =
		typeof value === "number" && Number.isInteger(value) && value >= 0
			? value
			: typeof value === "string" && /^\d+$/.test(value)
				? Number(value)
				: NaN;
	if (!Number.isFinite(parsed)) return DEFAULT_ROTATION_SECONDS;
	return Math.min(MAX_ROTATION_SECONDS, Math.max(MIN_ROTATION_SECONDS, parsed));
}

export function eventAlertPhase(event: Pick<Event, "outcome" | "voidedAt">) {
	if (event.voidedAt !== null) return null;
	if (event.outcome === null) return "Knockdown" as const;
	if (event.outcome === "Injury" || event.outcome === "Death") {
		return event.outcome;
	}
	return null;
}

export function alertKey(event: Pick<Event, "id" | "outcome" | "voidedAt">) {
	const phase = eventAlertPhase(event);
	return phase === null ? null : `${event.id}:${phase}`;
}

export function getCurrentAlertKeys(input: ProjectorInput) {
	const inProgressIds = new Set(
		input.matches
			.filter((match) => match.status === "InProgress")
			.map((match) => match.id),
	);
	return new Set(
		input.events.flatMap((event) => {
			const key = inProgressIds.has(event.matchId) ? alertKey(event) : null;
			return key === null ? [] : [key];
		}),
	);
}

export function findBreakingAlerts(
	input: ProjectorInput,
	seen: ReadonlySet<string>,
): { alerts: BreakingAlert[]; seen: Set<string> } {
	const nextSeen = new Set(seen);
	const inProgressIds = new Set(
		input.matches
			.filter((match) => match.status === "InProgress")
			.map((match) => match.id),
	);
	const highlightsById = new Map(
		projectProjectorHighlights(input).map((highlight) => [
			highlight.id,
			highlight,
		]),
	);
	const alerts: BreakingAlert[] = [];

	for (const event of [...input.events].sort(compareEventRecency)) {
		if (!inProgressIds.has(event.matchId)) continue;
		const key = alertKey(event);
		if (key === null || nextSeen.has(key)) continue;
		nextSeen.add(key);
		const highlight = highlightsById.get(event.id);
		if (highlight) alerts.push(highlight);
	}

	return { alerts, seen: nextSeen };
}

export function projectProjectorData(input: ProjectorInput): ProjectorData {
	const warbandById = new Map(
		input.warbands.map((warband) => [warband.id, warband]),
	);
	const combat = projectCombatStats(input.events, input.warriors);

	const standings = [...input.warbands].sort(
		(a, b) =>
			b.rating - a.rating || b.wins - a.wins || a.name.localeCompare(b.name),
	);
	const warriors = input.warriors
		.map((warrior): ProjectorWarrior => {
			const warriorCombat = getWarriorCombatStats(combat, warrior.id);
			return {
				...warrior,
				combat: warriorCombat,
				warbandName:
					warbandById.get(warrior.warbandId)?.name ?? "Unknown warband",
				effectiveStatus: warriorCombat.isDead ? "Dead" : warrior.status,
			};
		})
		.sort(
			(a, b) =>
				b.combat.deathsGiven - a.combat.deathsGiven ||
				b.combat.injuriesGiven - a.combat.injuriesGiven ||
				b.combat.knockdownsGiven - a.combat.knockdownsGiven ||
				a.name.localeCompare(b.name),
		);

	const participantNamesByMatch = new Map<string, string[]>();
	for (const participant of input.participants) {
		const name = warbandById.get(participant.warbandId)?.name;
		if (!name) continue;
		const names = participantNamesByMatch.get(participant.matchId) ?? [];
		names.push(name);
		participantNamesByMatch.set(participant.matchId, names);
	}
	const projectedMatches = input.matches.map(
		(match): ProjectorMatch => ({
			...match,
			participantNames: (participantNamesByMatch.get(match.id) ?? []).sort(
				(a, b) => a.localeCompare(b),
			),
			winnerName:
				match.winnerWarbandId === null
					? null
					: (warbandById.get(match.winnerWarbandId)?.name ?? "Unknown warband"),
		}),
	);
	const matches = {
		live: projectedMatches
			.filter((match) => match.status === "InProgress")
			.sort(compareMatchRecency),
		scheduled: projectedMatches
			.filter((match) => match.status === "Scheduled")
			.sort(compareMatchRecency),
		recent: projectedMatches
			.filter((match) => match.status === "Completed")
			.sort(compareMatchRecency)
			.slice(0, 4),
	};

	const highlights = projectProjectorHighlights(input).slice(0, 6);

	return {
		standings,
		warriors,
		matches,
		highlights,
		ticker: buildTicker(standings, matches.live, highlights),
	};
}

function projectProjectorHighlights(input: ProjectorInput) {
	const matchById = new Map(input.matches.map((match) => [match.id, match]));
	const warriorById = new Map(
		input.warriors.map((warrior) => [warrior.id, warrior]),
	);
	return input.events
		.filter((event) => event.voidedAt === null)
		.sort(compareEventRecency)
		.flatMap((event): ProjectorHighlight[] => {
			const phase = highlightPhase(event);
			if (phase === null) return [];
			return [
				{
					id: event.id,
					phase,
					matchId: event.matchId,
					matchName: matchById.get(event.matchId)?.name ?? "Unknown match",
					attackerName:
						warriorById.get(event.attackerWarriorId)?.name ?? "Unknown warrior",
					defenderId: event.defenderWarriorId,
					defenderName:
						warriorById.get(event.defenderWarriorId)?.name ?? "Unknown warrior",
					createdAt: event.createdAt,
					resolvedAt: event.resolvedAt,
				},
			];
		});
}

function highlightPhase(event: Pick<Event, "outcome">) {
	return event.outcome === "Injury" || event.outcome === "Death"
		? event.outcome
		: ("Knockdown" as const);
}

function buildTicker(
	standings: readonly Warband[],
	liveMatches: readonly ProjectorMatch[],
	highlights: readonly ProjectorHighlight[],
) {
	const reports: string[] = [];
	const leader = standings[0];
	if (leader) {
		reports.push(
			`${leader.name}: rating ${leader.rating}, ${leader.wins} wins`,
		);
	}
	for (const match of liveMatches.slice(0, 2)) {
		reports.push(
			`${match.name} — ${match.participantNames.join(" vs ") || "participants pending"} — ${match.scenario} — In progress`,
		);
	}
	for (const highlight of highlights.slice(0, 3)) {
		const action =
			highlight.phase === "Death"
				? "killed"
				: highlight.phase === "Injury"
					? "injured"
					: "knocked down";
		reports.push(
			`${highlight.attackerName} ${action} ${highlight.defenderName} — ${highlight.matchName}`,
		);
	}
	return reports.length > 0
		? [...new Set(reports)]
		: ["No campaign reports are available."];
}

function compareEventRecency(a: Event, b: Event) {
	return (
		compareDates(b.resolvedAt ?? b.createdAt, a.resolvedAt ?? a.createdAt) ||
		b.id.localeCompare(a.id)
	);
}

function compareMatchRecency(a: Match, b: Match) {
	return compareDates(b.updatedAt, a.updatedAt) || b.id.localeCompare(a.id);
}

function compareDates(a: string, b: string) {
	const aTime = Date.parse(a);
	const bTime = Date.parse(b);
	return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime);
}
