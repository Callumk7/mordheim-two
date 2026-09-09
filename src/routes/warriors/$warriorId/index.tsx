import { eq, or, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { WarriorPortrait } from "@/components/warrior-portrait";
import { getCollections } from "@/db-collections";
import { updateWarriorTransaction } from "@/db-collections/mutations/warriors";
import {
	getWarriorCombatStats,
	projectCombatStats,
} from "@/db-collections/projections";
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
	const {
		events: eventsCollection,
		warbands: warbandsCollection,
		warriors: warriorsCollection,
	} = collections;
	const { data: warriors } = useLiveQuery({
		query: (q) =>
			q
				.from({ warrior: warriorsCollection })
				.where(({ warrior }) => eq(warrior.id, warriorId)),
	});
	const { data: eventReferences } = useLiveQuery({
		query: (q) =>
			q
				.from({ event: eventsCollection })
				.where(({ event }) =>
					or(
						eq(event.attackerWarriorId, warriorId),
						eq(event.defenderWarriorId, warriorId),
					),
				),
	});
	const { data: warbands } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbandsCollection })
				.orderBy(({ warband }) => warband.name),
	});
	const warrior = warriors[0];
	const combat = getWarriorCombatStats(
		projectCombatStats(eventReferences),
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

			<Card className="mt-7">
				<CardContent>
					<h2 className="font-serif text-2xl text-foreground">Combat stats</h2>
					<dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
						<Stat label="Status" value={combat.isDead ? "Dead" : "Alive"} />
						<Stat label="Knockdowns given" value={combat.knockdownsGiven} />
						<Stat label="Knockdowns taken" value={combat.knockdownsTaken} />
						<Stat label="Injuries given" value={combat.injuriesGiven} />
						<Stat label="Injuries taken" value={combat.injuriesTaken} />
						<Stat label="Deaths given" value={combat.deathsGiven} />
					</dl>
				</CardContent>
			</Card>

			<Card className="mt-7">
				<CardContent>
					<h2 className="mb-2 font-serif text-2xl text-foreground">
						Profile and manual non-combat baseline
					</h2>
					<p className="mb-6 text-sm text-muted-foreground">
						Legacy injury and knockdown values are kept separately and do not
						alter combat stats.
					</p>
					<WarriorForm
						initialValues={warrior}
						isWarbandLocked={eventReferences.length > 0}
						key={warrior.id}
						onSubmit={async (values) => {
							const transaction = updateWarriorTransaction(
								collections,
								warrior.id,
								values,
							);
							await transaction.isPersisted.promise;
						}}
						submitLabel="Save changes"
						warbands={warbands}
					/>
				</CardContent>
			</Card>
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
