import { createFileRoute, Link } from "@tanstack/react-router";
import { CombatStatValue } from "@/components/shared/stat-display";
import { WarriorEquipment } from "@/components/warrior-equipment";
import { WarriorPortrait } from "@/components/warrior-portrait";
import { getCollections } from "@/db-collections";
import { useWarriorMutations } from "@/db-collections/mutations/warriors";
import {
	type CombatStatKey,
	type CombatStats,
	getWarriorCombatStats,
	projectCombatStats,
} from "@/db-collections/projections";
import { useWarriorDetails } from "@/db-collections/queries";
import { getWarriorPortrait } from "@/server/warrior-portraits";
import { Card, CardContent } from "../../../components/ui/card";
import { WarriorForm } from "../../../components/warrior-form";

export const Route = createFileRoute("/warriors/$warriorId/")({
	loader: ({ params }) =>
		getWarriorPortrait({ data: { warriorId: params.warriorId } }),
	component: WarriorDetailPage,
});

function WarriorDetailPage() {
	const { warriorId } = Route.useParams();
	const portrait = Route.useLoaderData();
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const { updateWarrior } = useWarriorMutations(dbClient);
	const { eventReferences, warbands, warrior } = useWarriorDetails(
		dbClient,
		warriorId,
	);
	const combat = getWarriorCombatStats(
		projectCombatStats(eventReferences, warrior ? [warrior] : []),
		warriorId,
	);
	const warband = warbands.find(
		(candidate) => candidate.id === warrior?.warbandId,
	);

	if (!warrior) return null;

	return (
		<div className="mx-auto max-w-3xl">
			<div className="flex items-center justify-between gap-4">
				<Link
					className="text-sm text-muted-foreground hover:text-primary/80"
					to="/warriors"
				>
					← Warriors
				</Link>
				<Link
					className="text-sm text-destructive/80 hover:text-destructive"
					params={{ warriorId }}
					to="/warriors/$warriorId/delete"
				>
					Delete warrior
				</Link>
			</div>

			<header className="mt-7 border-b border-border pb-6">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
					{warband?.name ?? "Unknown warband"} · {warrior.class}
				</p>
				<h1 className="mt-2 font-serif text-4xl font-semibold text-foreground">
					{warrior.name}
				</h1>
				<p className="mt-2 text-muted-foreground">
					Edit this warrior’s campaign record.
				</p>
			</header>

			<WarriorPortrait
				key={warrior.id}
				warriorId={warrior.id}
				name={warrior.name}
				portrait={portrait}
			/>

			<WarriorEquipment collections={collections} warriorId={warrior.id} />

			<Card className="mt-7">
				<CardContent>
					<h2 className="font-serif text-2xl text-foreground">Combat stats</h2>
					<dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
						<Stat label="Status" value={combat.isDead ? "Dead" : "Alive"} />
						<CombatStat
							label="Knockdowns given"
							stat="knockdownsGiven"
							stats={combat}
						/>
						<CombatStat
							label="Knockdowns taken"
							stat="knockdownsTaken"
							stats={combat}
						/>
						<CombatStat
							label="Injuries given"
							stat="injuriesGiven"
							stats={combat}
						/>
						<CombatStat
							label="Injuries taken"
							stat="injuriesTaken"
							stats={combat}
						/>
						<CombatStat
							label="Deaths given"
							stat="deathsGiven"
							stats={combat}
						/>
					</dl>
				</CardContent>
			</Card>

			<Card className="mt-7">
				<CardContent>
					<h2 className="mb-2 font-serif text-2xl text-foreground">
						Profile and manual corrections
					</h2>
					<p className="mb-6 text-sm text-muted-foreground">
						Signed corrections are added to combat totals calculated from
						events.
					</p>
					<WarriorForm
						initialValues={warrior}
						isWarbandLocked={eventReferences.length > 0}
						key={warrior.id}
						onSubmit={(values) => updateWarrior(warrior.id, values)}
						submitLabel="Save changes"
						warbands={warbands}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

function CombatStat({
	label,
	stat,
	stats,
}: {
	label: string;
	stat: CombatStatKey;
	stats: CombatStats;
}) {
	return (
		<div className="rounded-xl bg-muted/40 p-3">
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd className="mt-1 font-mono text-foreground">
				<CombatStatValue stat={stat} stats={stats} />
			</dd>
		</div>
	);
}

function Stat({ label, value }: { label: string; value: number | string }) {
	return (
		<div className="rounded-xl bg-muted/40 p-3">
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd className="mt-1 font-mono text-foreground">{value}</dd>
		</div>
	);
}
