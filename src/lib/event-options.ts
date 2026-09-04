import type { WarbandMatch } from "@/db/warband-match";
import type { Warrior } from "@/db/warrior";

export function getParticipantWarbandIds(
	matchId: string,
	participants: readonly WarbandMatch[],
) {
	return participants
		.filter((participant) => participant.matchId === matchId)
		.map((participant) => participant.warbandId);
}

export function getWarriorsForWarband(
	warbandId: string,
	warriors: readonly Warrior[],
) {
	return warriors.filter((warrior) => warrior.warbandId === warbandId);
}
