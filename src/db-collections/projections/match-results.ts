import type { Match } from "@/db/validation/match";
import type { Warband } from "@/db/validation/warband";
import type { WarbandMatch } from "@/db/validation/warband-match";

export interface MatchResultRow {
	draws: number;
	faction: string;
	id: string;
	losses: number;
	name: string;
	played: number;
	rank: number;
	winPercentage: number;
	wins: number;
}

export interface MatchResultsProjectionInput {
	matches: readonly Match[];
	participants: readonly WarbandMatch[];
	warbands: readonly Warband[];
}

type MatchRecord = Pick<MatchResultRow, "draws" | "losses" | "wins">;

/** Builds campaign-wide standings from finalized matches and their participants. */
export function projectMatchResults({
	matches,
	participants,
	warbands,
}: MatchResultsProjectionInput) {
	const records = new Map<string, MatchRecord>(
		warbands.map((warband) => [warband.id, { wins: 0, losses: 0, draws: 0 }]),
	);
	const participantIdsByMatch = new Map<string, Set<string>>();

	for (const participant of participants) {
		if (!records.has(participant.warbandId)) continue;
		const ids = participantIdsByMatch.get(participant.matchId) ?? new Set();
		ids.add(participant.warbandId);
		participantIdsByMatch.set(participant.matchId, ids);
	}

	for (const match of matches) {
		if (match.status !== "Completed" || match.result === "Pending") continue;
		const participantIds = participantIdsByMatch.get(match.id);
		if (!participantIds?.size) continue;

		if (match.result === "Victory") {
			const winnerId = match.winnerWarbandId;
			// A malformed result with a nonparticipating winner is not a result for
			// any of this match's participating warbands.
			if (!winnerId || !participantIds.has(winnerId)) continue;
			for (const warbandId of participantIds) {
				const record = records.get(warbandId);
				if (!record) continue;
				if (warbandId === winnerId) record.wins += 1;
				else record.losses += 1;
			}
		} else {
			for (const warbandId of participantIds) {
				const record = records.get(warbandId);
				if (record) record.draws += 1;
			}
		}
	}

	const rows = warbands
		.map<Omit<MatchResultRow, "rank">>((warband) => {
			const record = records.get(warband.id) ?? {
				wins: 0,
				losses: 0,
				draws: 0,
			};
			const played = record.wins + record.losses + record.draws;
			return {
				id: warband.id,
				name: warband.name,
				faction: warband.faction,
				...record,
				played,
				winPercentage:
					played === 0 ? 0 : Math.round((record.wins / played) * 100),
			};
		})
		.sort(compareMatchRecords);

	let previous: Omit<MatchResultRow, "rank"> | undefined;
	let rank = 0;
	const rankedRows = rows.map<MatchResultRow>((row, index) => {
		if (!previous || compareCompetitiveRecord(previous, row) !== 0) {
			rank = index + 1;
		}
		previous = row;
		return { ...row, rank };
	});
	const playedRows = rankedRows.filter((row) => row.played > 0);

	return {
		hasMatchResults: playedRows.length > 0,
		matchResultRows: rankedRows,
		leadingMatchResults: playedRows.slice(0, 8),
	};
}

function compareCompetitiveRecord(
	a: Omit<MatchResultRow, "rank">,
	b: Omit<MatchResultRow, "rank">,
) {
	return (
		b.wins - a.wins ||
		b.winPercentage - a.winPercentage ||
		b.draws - a.draws ||
		a.losses - b.losses
	);
}

function compareMatchRecords(
	a: Omit<MatchResultRow, "rank">,
	b: Omit<MatchResultRow, "rank">,
) {
	return compareCompetitiveRecord(a, b) || a.name.localeCompare(b.name);
}

export type MatchResultsProjection = ReturnType<typeof projectMatchResults>;
