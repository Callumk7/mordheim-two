import type { ReactNode } from "react";
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
import type { CombatLeaderboardRow } from "@/db-collections/projections/combat-leaderboard";
import {
	type CombatStatKey,
	type CombatStats,
	getCombatStatAdjustment,
} from "@/db-collections/projections/combat-stats";

export function AdjustedBadge({
	accessibleLabel,
	adjustment,
}: {
	accessibleLabel?: string;
	adjustment?: number;
}) {
	if (adjustment === 0) return null;
	const correction = adjustment ?? 1;
	const signedAdjustment = correction > 0 ? `+${correction}` : `${correction}`;
	const description = accessibleLabel ?? `Adjusted by ${signedAdjustment}`;
	return (
		<span
			className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[0.625rem] font-semibold leading-none text-primary"
			title={accessibleLabel ?? `Manual correction: ${signedAdjustment}`}
		>
			<span aria-hidden="true">Adjusted</span>
			<span className="sr-only">{description}</span>
		</span>
	);
}

export function CombatStatValue({
	className,
	stat,
	stats,
}: {
	className?: string;
	stat: CombatStatKey;
	stats: CombatStats;
}) {
	return (
		<span className={className}>
			{stats[stat]}{" "}
			<AdjustedBadge adjustment={getCombatStatAdjustment(stats, stat)} />
		</span>
	);
}

export function StatTile({
	adjustment = 0,
	label,
	value,
}: {
	adjustment?: number;
	label: string;
	value: number;
}) {
	return (
		<Card size="sm">
			<CardContent>
				<p className="text-sm text-muted-foreground">{label}</p>
				<p className="mt-2 flex items-baseline gap-2 font-mordheim text-4xl tabular-nums text-primary">
					{value}
					<AdjustedBadge adjustment={adjustment} />
				</p>
			</CardContent>
		</Card>
	);
}

export function CombatLeaderboard({
	description,
	detailFor,
	emptyMessage,
	entityLabel,
	rows,
	title,
}: {
	description: string;
	detailFor?: (row: CombatLeaderboardRow) => ReactNode;
	emptyMessage: string;
	entityLabel: string;
	rows: readonly CombatLeaderboardRow[];
	title: string;
}) {
	return (
		<Card>
			<CardHeader className="border-b border-border">
				<CardTitle>
					<h2 className="font-mordheim text-2xl text-foreground">{title}</h2>
				</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				{rows.length ? (
					<Table aria-label={title} className="min-w-190">
						<TableHeader className="bg-muted/30">
							<TableHead className="w-14 text-right">Rank</TableHead>
							<TableHead isRowHeader>{entityLabel}</TableHead>
							<TableHead className="text-right">Knockdowns given</TableHead>
							<TableHead className="text-right">Injuries given</TableHead>
							<TableHead className="text-right">Deaths given</TableHead>
							<TableHead className="text-right">Knockdowns taken</TableHead>
							<TableHead className="text-right">Injuries taken</TableHead>
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
										{detailFor ? (
											<span className="mt-0.5 block text-xs text-muted-foreground">
												{detailFor(row)}
											</span>
										) : null}
									</TableCell>
									<TableCell className="text-right font-mono tabular-nums">
										<CombatStatValue stat="knockdownsGiven" stats={row} />
									</TableCell>
									<TableCell className="text-right font-mono tabular-nums">
										<CombatStatValue stat="injuriesGiven" stats={row} />
									</TableCell>
									<TableCell className="text-right font-mono tabular-nums text-primary">
										<CombatStatValue stat="deathsGiven" stats={row} />
									</TableCell>
									<TableCell className="text-right font-mono tabular-nums">
										<CombatStatValue stat="knockdownsTaken" stats={row} />
									</TableCell>
									<TableCell className="text-right font-mono tabular-nums">
										<CombatStatValue stat="injuriesTaken" stats={row} />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				) : (
					<output className="block rounded-xl border border-dashed border-input px-6 py-10 text-center">
						<p className="font-medium text-foreground">No standings yet</p>
						<p className="mt-1 text-sm text-muted-foreground">{emptyMessage}</p>
					</output>
				)}
			</CardContent>
		</Card>
	);
}

export function ReservedStatSection({
	description,
	label,
	title,
}: {
	description: string;
	label: string;
	title: string;
}) {
	return (
		<section
			aria-labelledby={`${label}-title`}
			className="min-h-56 rounded-2xl border border-dashed border-input bg-card/40 p-6"
		>
			<p className="text-xs font-semibold tracking-widest text-primary uppercase">
				Reserved · {label}
			</p>
			<h2
				className="mt-4 font-mordheim text-2xl text-foreground"
				id={`${label}-title`}
			>
				{title}
			</h2>
			<p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
				{description}
			</p>
		</section>
	);
}
