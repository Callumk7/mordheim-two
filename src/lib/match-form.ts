import type { Match } from "@/db/match";

export type MatchFormValues = Pick<Match, "name" | "scenario" | "status"> & {
	participantWarbandIds: string[];
};

export function isMatchParticipantLocked(
	warbandId: string,
	participantWarbandIds: readonly string[],
	lockedParticipantWarbandIds: readonly string[],
) {
	return (
		participantWarbandIds.includes(warbandId) &&
		lockedParticipantWarbandIds.includes(warbandId)
	);
}

export function changeMatchParticipantSelection(
	participantWarbandIds: readonly string[],
	warbandId: string,
	isSelected: boolean,
	lockedParticipantWarbandIds: readonly string[],
) {
	if (
		!isSelected &&
		isMatchParticipantLocked(
			warbandId,
			participantWarbandIds,
			lockedParticipantWarbandIds,
		)
	) {
		return [...participantWarbandIds];
	}

	if (isSelected) {
		return participantWarbandIds.includes(warbandId)
			? [...participantWarbandIds]
			: [...participantWarbandIds, warbandId];
	}

	return participantWarbandIds.filter((id) => id !== warbandId);
}

export function canSubmitMatch(values: MatchFormValues) {
	return Boolean(values.name.trim() && values.scenario.trim());
}
