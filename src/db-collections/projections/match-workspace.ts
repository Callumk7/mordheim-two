import type { Event } from "@/db/event";
import type { Match } from "@/db/match";
import type { Warband } from "@/db/warband";
import type { WarbandMatch } from "@/db/warband-match";
import type { Warrior } from "@/db/warrior";

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
		canAddEvent: Boolean(match) && staffedWarbands.length >= 2,
		events,
		lockedParticipantWarbandIds,
		match,
		participants,
		staffedWarbands,
		warbands,
		warriors,
	};
}

export type MatchWorkspace = ReturnType<typeof projectMatchWorkspace>;
