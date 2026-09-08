import type { Event } from "@/db/validation/event";
import type { Match } from "@/db/validation/match";
import type { Warband } from "@/db/validation/warband";
import type { WarbandMatch } from "@/db/validation/warband-match";
import type { Warrior } from "@/db/validation/warrior";

export type MatchEventRow = Event & {
	attackerName: string;
	attackerWarriorName: string;
	defenderName: string;
	defenderWarriorName: string;
};

export type MatchParticipantWarband = Warband & {
	warriors: Warrior[];
};

export interface MatchWorkspaceProjectionInput {
	allWarbands: readonly Warband[];
	events: readonly MatchEventRow[];
	match: Match | undefined;
	participants: readonly WarbandMatch[];
	warriors: readonly Warrior[];
}

export function projectMatchWorkspace({
	allWarbands,
	events,
	match,
	participants,
	warriors,
}: MatchWorkspaceProjectionInput) {
	const participantIds = new Set(
		participants.map((participant) => participant.warbandId),
	);
	const warbands = allWarbands
		.filter((warband) => participantIds.has(warband.id))
		.map<MatchParticipantWarband>((warband) => ({
			...warband,
			warriors: warriors.filter((warrior) => warrior.warbandId === warband.id),
		}));
	const staffedWarbands = warbands.filter(
		(warband) => warband.warriors.length > 0,
	);
	const winnerWarband =
		match?.winnerWarbandId === null
			? undefined
			: warbands.find((warband) => warband.id === match?.winnerWarbandId);
	const lockedParticipantWarbandIds = [
		...new Set(
			events.flatMap((event) => [
				event.attackerWarbandId,
				event.defenderWarbandId,
			]),
		),
	];

	return {
		allWarbands,
		canAddEvent:
			Boolean(match) &&
			match?.status !== "Completed" &&
			staffedWarbands.length >= 2,
		events,
		lockedParticipantWarbandIds,
		match,
		participants,
		staffedWarbands,
		warbands,
		warriors,
		winnerWarband,
	};
}

export type MatchWorkspace = ReturnType<typeof projectMatchWorkspace>;
