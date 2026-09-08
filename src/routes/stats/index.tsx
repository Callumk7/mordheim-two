import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { IndexPage, IndexPageHeader } from "@/components/index-page";
import { buildCombatLeaderboard } from "@/components/shared/combat-leaderboard";
import {
	CombatLeaderboard,
	ReservedStatSection,
	StatTile,
} from "@/components/shared/stat-display";
import { getCollections } from "@/db-collections";
import { useCombatStats } from "@/db-collections/queries";

export const Route = createFileRoute("/stats/")({
	ssr: false,
	loader: async ({ context }) => {
		const { events, warbands, warriors } = getCollections(context.dbClient);
		await Promise.all([
			events.preload(),
			warbands.preload(),
			warriors.preload(),
		]);
		return null;
	},
	component: StatsIndexPage,
});

function StatsIndexPage() {
	const { dbClient } = Route.useRouteContext();
	const { warbands: warbandsCollection, warriors: warriorsCollection } =
		getCollections(dbClient);
	const combatStats = useCombatStats(dbClient);
	const { data: warbands } = useLiveQuery({
		query: (q) => q.from({ warband: warbandsCollection }),
	});
	const { data: warriors } = useLiveQuery({
		query: (q) => q.from({ warrior: warriorsCollection }),
	});

	const warbandRows = useMemo(
		() => buildCombatLeaderboard(warbands, combatStats.warbands),
		[combatStats.warbands, warbands],
	);
	const warriorRows = useMemo(
		() => buildCombatLeaderboard(warriors, combatStats.warriors),
		[combatStats.warriors, warriors],
	);
	const warbandById = useMemo(
		() => new Map(warbands.map((warband) => [warband.id, warband])),
		[warbands],
	);
	const warriorById = useMemo(
		() => new Map(warriors.map((warrior) => [warrior.id, warrior])),
		[warriors],
	);
	const totals = useMemo(
		() =>
			Array.from(combatStats.warbands.values()).reduce(
				(total, stats) => ({
					knockdowns: total.knockdowns + stats.knockdownsGiven,
					injuries: total.injuries + stats.injuriesGiven,
					deaths: total.deaths + stats.deathsGiven,
				}),
				{ knockdowns: 0, injuries: 0, deaths: 0 },
			),
		[combatStats.warbands],
	);

	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
			<IndexPage>
				<IndexPageHeader
					action={
						<span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
							Live event projection
						</span>
					}
					description="Campaign combat standings calculated from active combat events."
					title="Statistics"
				/>

				<section aria-labelledby="campaign-totals-heading">
					<h2
						className="mb-4 font-mordheim text-2xl text-foreground"
						id="campaign-totals-heading"
					>
						Campaign totals
					</h2>
					<div className="grid gap-4 sm:grid-cols-3">
						<StatTile label="Knockdowns" value={totals.knockdowns} />
						<StatTile label="Injuries" value={totals.injuries} />
						<StatTile label="Deaths" value={totals.deaths} />
					</div>
				</section>

				<div className="grid gap-6">
					<CombatLeaderboard
						description="Ranked by deaths, then injuries, then knockdowns given. Exact combat ties share a rank and are ordered by name."
						detailFor={(row) => {
							const warrior = warriorById.get(row.id);
							if (!warrior) return null;
							return `${warrior.class} · ${warbandById.get(warrior.warbandId)?.name ?? "Unknown warband"}`;
						}}
						emptyMessage="Add warriors to the campaign to establish the warrior standings."
						entityLabel="Warrior"
						rows={warriorRows}
						title="Warrior leaderboard"
					/>
					<CombatLeaderboard
						description="Ranked by deaths, then injuries, then knockdowns given. Exact combat ties share a rank and are ordered by name."
						detailFor={(row) => warbandById.get(row.id)?.faction}
						emptyMessage="Add a warband to the campaign to establish the warband standings."
						entityLabel="Warband"
						rows={warbandRows}
						title="Warband leaderboard"
					/>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					<ReservedStatSection
						description="Historical event snapshots are not available yet. This area is intentionally reserved for future time-series combat trends."
						label="charts"
						title="Combat history charts"
					/>
					<ReservedStatSection
						description="Match results are not calculated on this dashboard. This space is reserved for a future results summary."
						label="match-results"
						title="Match results"
					/>
				</div>
			</IndexPage>
		</main>
	);
}
