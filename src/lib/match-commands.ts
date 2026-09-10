import type { Match } from "@/db/validation/match";
import type { WarbandMatch } from "@/db/validation/warband-match";
import type { MatchFormValues } from "@/lib/match-form";

type CommandSources = {
	newId: () => string;
	now: () => string;
};

function buildParticipants(
	matchId: string,
	warbandIds: readonly string[],
	timestamp: string,
	newId: () => string,
): WarbandMatch[] {
	return warbandIds.map((warbandId) => ({
		id: newId(),
		matchId,
		warbandId,
		createdAt: timestamp,
		updatedAt: timestamp,
	}));
}

/** Sources are required: only the integration boundary chooses real time/UUIDs. */
export function buildCreateMatchCommand(
	{ participantWarbandIds, ...values }: MatchFormValues,
	{ newId, now }: CommandSources,
) {
	const timestamp = now();
	const match: Match = {
		id: newId(),
		...values,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
	return {
		match,
		participants: buildParticipants(
			match.id,
			[...new Set(participantWarbandIds)],
			timestamp,
			newId,
		),
	};
}

/** Additions follow first selection order; removals follow existing row order. */
export function diffMatchParticipants(
	existing: readonly WarbandMatch[],
	selectedWarbandIds: readonly string[],
) {
	const selectedIds = new Set(selectedWarbandIds);
	const existingIds = new Set(existing.map((row) => row.warbandId));
	return {
		additionWarbandIds: [...selectedIds].filter((id) => !existingIds.has(id)),
		removals: existing.filter((row) => !selectedIds.has(row.warbandId)),
	};
}

export function buildUpdateMatchCommand(
	matchId: string,
	{ participantWarbandIds, ...changes }: MatchFormValues,
	existing: readonly WarbandMatch[],
	{ newId, now }: CommandSources,
) {
	const { additionWarbandIds, removals } = diffMatchParticipants(
		existing,
		participantWarbandIds,
	);
	return {
		id: matchId,
		changes,
		additions: additionWarbandIds.length
			? buildParticipants(matchId, additionWarbandIds, now(), newId)
			: [],
		removals,
	};
}
