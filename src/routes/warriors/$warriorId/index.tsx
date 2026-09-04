import { eq, or, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getCollections } from "@/db-collections";
import { updateWarriorTransaction } from "@/db-collections/mutations/warriors";
import { Card, CardContent } from "../../../components/ui/card";
import { WarriorForm } from "../../../components/warrior-form";

export const Route = createFileRoute("/warriors/$warriorId/")({
	component: WarriorDetailPage,
});

function WarriorDetailPage() {
	const { warriorId } = Route.useParams();
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

			<Card className="mt-7">
				<CardContent>
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
