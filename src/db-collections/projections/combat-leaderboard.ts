import type { CombatStats } from "@/db-collections/projections/combat-stats";

interface CombatLeaderboardEntity {
	id: string;
	name: string;
}

export interface CombatLeaderboardRow extends CombatStats {
	id: string;
	name: string;
	rank: number;
}

const ZERO_STATS: CombatStats = {
	knockdownsGiven: 0,
	knockdownsTaken: 0,
	injuriesGiven: 0,
	injuriesTaken: 0,
	deathsGiven: 0,
};

const comparePerformance = (a: CombatStats, b: CombatStats): number =>
	b.deathsGiven - a.deathsGiven ||
	b.injuriesGiven - a.injuriesGiven ||
	b.knockdownsGiven - a.knockdownsGiven;

const compareText = (a: string, b: string): number =>
	a === b ? 0 : a < b ? -1 : 1;

export function buildCombatLeaderboard(
	entities: readonly CombatLeaderboardEntity[],
	statsById: ReadonlyMap<string, CombatStats>,
): CombatLeaderboardRow[] {
	const sorted = entities
		.map((entity) => ({
			...entity,
			...(statsById.get(entity.id) ?? ZERO_STATS),
		}))
		.sort(
			(a, b) =>
				comparePerformance(a, b) ||
				compareText(a.name, b.name) ||
				compareText(a.id, b.id),
		);

	let previousRank = 0;
	return sorted.map((row, index) => {
		const rank =
			index > 0 && comparePerformance(sorted[index - 1], row) === 0
				? previousRank
				: index + 1;
		previousRank = rank;
		return { ...row, rank };
	});
}
