import { createFileRoute } from "@tanstack/react-router";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Pie,
	PieChart,
	XAxis,
	YAxis,
} from "recharts";
import { IndexPage, IndexPageHeader } from "@/components/shared/index-page";
import { MatchResultsTable } from "@/components/shared/match-results-table";
import { Page, PageError, PagePending } from "@/components/shared/page";
import {
	AdjustedBadge,
	CombatLeaderboard,
	StatTile,
} from "@/components/shared/stat-display";
import { Typography } from "@/components/shared/typography";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { getCollections } from "@/db-collections";
import { useStatsDashboard } from "@/db-collections/queries";

const matchResultsChartConfig = {
	winPercentage: { label: "Win percentage", color: "var(--chart-1)" },
} satisfies ChartConfig;

const combatChartConfig = {
	knockdownsGiven: { label: "Knockdowns", color: "var(--chart-1)" },
	injuriesGiven: { label: "Injuries", color: "var(--chart-2)" },
	deathsGiven: { label: "Deaths", color: "var(--chart-3)" },
} satisfies ChartConfig;

export const Route = createFileRoute("/stats/")({
	ssr: false,
	loader: async ({ context }) => {
		const { events, matches, warbandMatches, warbands, warriors } =
			getCollections(context.dbClient);
		await Promise.all([
			events.preload(),
			matches.preload(),
			warbandMatches.preload(),
			warbands.preload(),
			warriors.preload(),
		]);
		return null;
	},
	pendingComponent: () => <PagePending>Loading statistics…</PagePending>,
	errorComponent: () => (
		<PageError>
			<h1 className="font-mordheim text-3xl">Unable to load statistics</h1>
			<p className="mt-2 text-muted-foreground">
				Check the database connection and migrations, then reload this page.
			</p>
		</PageError>
	),
	component: StatsIndexPage,
});

function StatsIndexPage() {
	const { dbClient } = Route.useRouteContext();
	const {
		warbandRows,
		warriorRows,
		warbandById,
		warriorById,
		totals,
		totalAdjustments,
		hasCombat,
		leadingWarbands,
		matchResultRows,
		leadingMatchResults,
	} = useStatsDashboard(dbClient);

	const hasAdjustedOutcomes = Object.values(totalAdjustments).some(
		(adjustment) => adjustment !== 0,
	);
	const hasAdjustedWarbandLeader = leadingWarbands.some((row) =>
		Object.values(row.adjustments ?? {}).some((adjustment) => adjustment !== 0),
	);
	const outcomeData = [
		{
			outcome: "knockdownsGiven",
			count: totals.knockdowns,
			fill: "var(--color-knockdownsGiven)",
		},
		{
			outcome: "injuriesGiven",
			count: totals.injuries,
			fill: "var(--color-injuriesGiven)",
		},
		{
			outcome: "deathsGiven",
			count: totals.deaths,
			fill: "var(--color-deathsGiven)",
		},
	];

	return (
		<Page>
			<IndexPage>
				<IndexPageHeader
					action={
						<span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
							Live combat projection
						</span>
					}
					description="Campaign combat standings combine active events with manual warrior corrections."
					title="Statistics"
				/>

				<section aria-labelledby="campaign-totals-heading">
					<Typography
						variant="sectionTitle"
						className="mb-4 text-foreground"
						id="campaign-totals-heading"
					>
						Campaign totals
					</Typography>
					<div className="grid gap-4 sm:grid-cols-3">
						<StatTile
							adjustment={totalAdjustments.knockdowns}
							label="Knockdowns"
							value={totals.knockdowns}
						/>
						<StatTile
							adjustment={totalAdjustments.injuries}
							label="Injuries"
							value={totals.injuries}
						/>
						<StatTile
							adjustment={totalAdjustments.deaths}
							label="Deaths"
							value={totals.deaths}
						/>
					</div>
				</section>

				<section
					aria-label="Combat charts"
					className="grid gap-6 lg:grid-cols-2"
				>
					<Card className="min-w-0">
						<CardHeader>
							<Typography
								variant="sectionTitle"
								className="flex items-center gap-2"
							>
								Combat outcomes
								{hasAdjustedOutcomes ? (
									<AdjustedBadge accessibleLabel="Chart includes manual corrections" />
								) : null}
							</Typography>
							<CardDescription>
								Share of recorded knockdowns, injuries, and deaths across the
								campaign.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{hasCombat ? (
								<ChartContainer
									config={combatChartConfig}
									className="h-80 w-full aspect-auto"
									aria-label={`Combat outcomes: ${totals.knockdowns} knockdowns, ${totals.injuries} injuries, ${totals.deaths} deaths.`}
								>
									<PieChart accessibilityLayer>
										<ChartTooltip
											content={
												<ChartTooltipContent nameKey="outcome" hideLabel />
											}
										/>
										<Pie
											data={outcomeData}
											dataKey="count"
											nameKey="outcome"
											innerRadius="55%"
											outerRadius="80%"
											strokeWidth={2}
										/>
										<ChartLegend
											content={<ChartLegendContent nameKey="outcome" />}
										/>
									</PieChart>
								</ChartContainer>
							) : (
								<p className="flex h-80 items-center justify-center text-center text-muted-foreground">
									Record combat events to see the outcome breakdown.
								</p>
							)}
						</CardContent>
					</Card>
					<Card className="min-w-0">
						<CardHeader>
							<Typography
								variant="sectionTitle"
								className="flex items-center gap-2"
							>
								Leading warbands
								{hasAdjustedWarbandLeader ? (
									<AdjustedBadge accessibleLabel="Chart includes manual corrections" />
								) : null}
							</Typography>
							<CardDescription>
								Combat given by the top eight active warbands, in leaderboard
								order. Full names and counts appear in the standings below.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{leadingWarbands.length > 0 ? (
								<ChartContainer
									config={combatChartConfig}
									className="h-80 w-full aspect-auto"
									aria-label="Stacked combat counts for leading warbands; exact values are in the warband leaderboard below."
								>
									<BarChart
										accessibilityLayer
										data={leadingWarbands}
										layout="vertical"
										margin={{ left: 0, right: 12 }}
									>
										<CartesianGrid horizontal={false} />
										<XAxis
											type="number"
											allowDecimals={false}
											axisLine={false}
											tickLine={false}
										/>
										<YAxis
											type="category"
											dataKey="id"
											width={100}
											axisLine={false}
											tickLine={false}
											tickFormatter={(id: string) => {
												const name = warbandById.get(id)?.name ?? id;
												return name.length > 14
													? `${name.slice(0, 14)}…`
													: name;
											}}
										/>
										<ChartTooltip
											content={
												<ChartTooltipContent
													labelFormatter={(_, payload) =>
														warbandById.get(payload[0]?.payload.id)?.name
													}
												/>
											}
										/>
										<ChartLegend content={<ChartLegendContent />} />
										<Bar
											dataKey="knockdownsGiven"
											stackId="combat"
											fill="var(--color-knockdownsGiven)"
										/>
										<Bar
											dataKey="injuriesGiven"
											stackId="combat"
											fill="var(--color-injuriesGiven)"
										/>
										<Bar
											dataKey="deathsGiven"
											stackId="combat"
											fill="var(--color-deathsGiven)"
										/>
									</BarChart>
								</ChartContainer>
							) : (
								<p className="flex h-80 items-center justify-center text-center text-muted-foreground">
									Record combat events for a warband to compare its performance.
								</p>
							)}
						</CardContent>
					</Card>
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

				<section
					aria-label="Campaign match standings"
					className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]"
				>
					<MatchResultsTable rows={matchResultRows} />
					<Card className="min-w-0">
						<CardHeader>
							<Typography variant="sectionTitle">Match leaders</Typography>
							<CardDescription>
								Win percentages for the top eight warbands with completed
								results, in standings order.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{leadingMatchResults.length > 0 ? (
								<ChartContainer
									config={matchResultsChartConfig}
									className="h-80 w-full aspect-auto"
									aria-label="Win percentages for current match leaders; exact records are in the match results table."
								>
									<BarChart
										accessibilityLayer
										data={leadingMatchResults}
										layout="vertical"
										margin={{ left: 0, right: 12 }}
									>
										<CartesianGrid horizontal={false} />
										<XAxis
											type="number"
											domain={[0, 100]}
											axisLine={false}
											tickLine={false}
											tickFormatter={(value: number) => `${value}%`}
										/>
										<YAxis
											type="category"
											dataKey="name"
											width={100}
											axisLine={false}
											tickLine={false}
											tickFormatter={(name: string) =>
												name.length > 14 ? `${name.slice(0, 14)}…` : name
											}
										/>
										<ChartTooltip content={<ChartTooltipContent />} />
										<Bar
											dataKey="winPercentage"
											fill="var(--color-winPercentage)"
											radius={[0, 4, 4, 0]}
										/>
									</BarChart>
								</ChartContainer>
							) : (
								<p className="flex h-80 items-center justify-center text-center text-muted-foreground">
									Complete a match to compare win percentages.
								</p>
							)}
						</CardContent>
					</Card>
				</section>
			</IndexPage>
		</Page>
	);
}
