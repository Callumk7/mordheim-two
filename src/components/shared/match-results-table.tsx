import { Typography } from "@/components/shared/typography";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { MatchResultRow } from "@/db-collections/projections/match-results";

export function MatchResultsTable({
	rows,
}: {
	rows: readonly MatchResultRow[];
}) {
	const hasResults = rows.some((row) => row.played > 0);

	return (
		<Card>
			<CardHeader className="border-b border-border">
				<CardTitle>
					<Typography variant="sectionTitle" className="text-foreground">
						Match results
					</Typography>
				</CardTitle>
				<CardDescription>
					Completed results ranked by wins, then win percentage, draws, and
					fewest losses. Equal records share a rank.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{hasResults ? (
					<Table aria-label="Campaign match results" className="min-w-175">
						<TableHeader className="bg-muted/30">
							<TableHead className="w-14 text-right">Rank</TableHead>
							<TableHead isRowHeader>Warband</TableHead>
							<TableHead className="text-right">Wins</TableHead>
							<TableHead className="text-right">Losses</TableHead>
							<TableHead className="text-right">Draws</TableHead>
							<TableHead className="text-right">Played</TableHead>
							<TableHead className="text-right">Win percentage</TableHead>
						</TableHeader>
						<TableBody>
							{rows.map((row) => (
								<TableRow key={row.id}>
									<TableCell className="text-right font-mono text-muted-foreground">
										{row.rank}
									</TableCell>
									<TableCell>
										<span className="font-semibold text-foreground">
											{row.name}
										</span>
										<span className="mt-0.5 block text-xs text-muted-foreground">
											{row.faction}
										</span>
									</TableCell>
									{(["wins", "losses", "draws", "played"] as const).map(
										(stat) => (
											<TableCell
												className="text-right font-mono tabular-nums"
												key={stat}
											>
												{row[stat]}
											</TableCell>
										),
									)}
									<TableCell className="text-right font-mono tabular-nums text-primary">
										{row.winPercentage}%
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				) : (
					<output className="block rounded-xl border border-dashed border-input px-6 py-10 text-center">
						<p className="font-medium text-foreground">No match results yet</p>
						<p className="mt-1 text-sm text-muted-foreground">
							Complete a match and record a victory or draw to establish the
							standings.
						</p>
					</output>
				)}
			</CardContent>
		</Card>
	);
}
