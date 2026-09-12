import type { Match } from "@/db/validation/match";

export type MatchFormValues = Pick<
	Match,
	"name" | "scenario" | "status" | "result" | "winnerWarbandId"
> & {
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

export function isMatchResultConsistent(
	result: Match["result"],
	winnerWarbandId: string | null,
	participantWarbandIds: readonly string[],
) {
	if (result === "Victory") {
		return (
			winnerWarbandId !== null &&
			participantWarbandIds.includes(winnerWarbandId)
		);
	}
	return winnerWarbandId === null;
}

export function canSubmitMatch(values: MatchFormValues) {
	if (!values.name.trim() || !values.scenario.trim()) return false;
	return isMatchResultConsistent(
		values.result,
		values.winnerWarbandId,
		values.participantWarbandIds,
	);
}
