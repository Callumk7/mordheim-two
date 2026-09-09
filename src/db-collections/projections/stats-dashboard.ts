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
	// Sum event-derived stats, not roster rows: missing entities must not erase history.
	const totals = Array.from(combatStats.warbands.values()).reduce(
		(total, stats) => ({
			knockdowns: total.knockdowns + stats.knockdownsGiven,
			injuries: total.injuries + stats.injuriesGiven,
			deaths: total.deaths + stats.deathsGiven,
		}),
		{ knockdowns: 0, injuries: 0, deaths: 0 },
	);

	return {
		warbandRows,
		warriorRows,
		warbandById: new Map(warbands.map((warband) => [warband.id, warband])),
		warriorById: new Map(warriors.map((warrior) => [warrior.id, warrior])),
		totals,
		hasCombat: totals.knockdowns + totals.injuries + totals.deaths > 0,
		leadingWarbands: warbandRows
			.filter(
				(row) => row.knockdownsGiven + row.injuriesGiven + row.deathsGiven > 0,
			)
			.slice(0, 8),
	};
}

export type StatsDashboard = ReturnType<typeof projectStatsDashboard>;
