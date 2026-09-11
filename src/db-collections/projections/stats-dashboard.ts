import type { Warband } from "@/db/validation/warband";
import type { Warrior } from "@/db/validation/warrior";
import { buildCombatLeaderboard } from "@/db-collections/projections/combat-leaderboard";
import type { CombatStatsProjection } from "@/db-collections/projections/combat-stats";

export interface StatsDashboardProjectionInput {
	warbands: readonly Warband[];
	warriors: readonly Warrior[];
	combatStats: CombatStatsProjection;
}

export function projectStatsDashboard({
	warbands,
	warriors,
	combatStats,
}: StatsDashboardProjectionInput) {
	const warbandRows = buildCombatLeaderboard(warbands, combatStats.warbands);
	const warriorRows = buildCombatLeaderboard(warriors, combatStats.warriors);
	// Sum projected warband stats so missing roster entities do not erase event
	// history and each warrior correction is counted exactly once.
	const { totals, totalAdjustments } = Array.from(
		combatStats.warbands.values(),
	).reduce(
		(result, stats) => ({
			totals: {
				knockdowns: result.totals.knockdowns + stats.knockdownsGiven,
				injuries: result.totals.injuries + stats.injuriesGiven,
				deaths: result.totals.deaths + stats.deathsGiven,
			},
			totalAdjustments: {
				knockdowns:
					result.totalAdjustments.knockdowns +
					(stats.adjustments?.knockdownsGiven ?? 0),
				injuries:
					result.totalAdjustments.injuries +
					(stats.adjustments?.injuriesGiven ?? 0),
				deaths:
					result.totalAdjustments.deaths +
					(stats.adjustments?.deathsGiven ?? 0),
			},
		}),
		{
			totals: { knockdowns: 0, injuries: 0, deaths: 0 },
			totalAdjustments: { knockdowns: 0, injuries: 0, deaths: 0 },
		},
	);

	return {
		warbandRows,
		warriorRows,
		warbandById: new Map(warbands.map((warband) => [warband.id, warband])),
		warriorById: new Map(warriors.map((warrior) => [warrior.id, warrior])),
		totals,
		totalAdjustments,
		hasCombat:
			totals.knockdowns !== 0 || totals.injuries !== 0 || totals.deaths !== 0,
		leadingWarbands: warbandRows
			.filter(
				(row) =>
					row.knockdownsGiven !== 0 ||
					row.injuriesGiven !== 0 ||
					row.deathsGiven !== 0,
			)
			.slice(0, 8),
	};
}

export type StatsDashboard = ReturnType<typeof projectStatsDashboard>;
