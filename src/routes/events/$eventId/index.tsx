import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EventForm } from "@/components/event-form";
import { Card, CardContent } from "@/components/ui/card";
import { getCollections } from "@/db-collections";
import { getParticipantWarbandIds } from "@/lib/event-options";

export const Route = createFileRoute("/events/$eventId/")({
	component: EventDetailPage,
});

function EventDetailPage() {
	const { eventId } = Route.useParams();
	const { dbClient } = Route.useRouteContext();
	const { events, matches, warbandMatches, warbands, warriors } =
		getCollections(dbClient);
	const { data: eventRows } = useLiveQuery({
		query: (q) =>
			q.from({ event: events }).where(({ event }) => eq(event.id, eventId)),
	});
	const { data: matchRows } = useLiveQuery({
		query: (q) => q.from({ match: matches }).orderBy(({ match }) => match.name),
	});
	const { data: participantRows } = useLiveQuery({
		query: (q) => q.from({ participant: warbandMatches }),
	});
	const { data: warbandRows } = useLiveQuery({
		query: (q) =>
			q.from({ warband: warbands }).orderBy(({ warband }) => warband.name),
	});
	const { data: warriorRows } = useLiveQuery({
		query: (q) =>
			q.from({ warrior: warriors }).orderBy(({ warrior }) => warrior.name),
	});
	const event = eventRows[0];
	const match = matchRows.find((candidate) => candidate.id === event?.matchId);
	const eligibleMatches = matchRows.filter((candidate) => {
		const participantIds = getParticipantWarbandIds(
			candidate.id,
			participantRows,
		);
		return (
			participantIds.filter((warbandId) =>
				warriorRows.some((warrior) => warrior.warbandId === warbandId),
			).length >= 2
		);
	});

	if (!event) return null;

	return (
		<div className="mx-auto max-w-3xl">
			<div className="flex items-center justify-between gap-4">
				<Link
					className="text-sm text-muted-foreground hover:text-primary/80"
					to="/events"
				>
					← Events
				</Link>
				<Link
					className="text-sm text-destructive/80 hover:text-destructive"
					params={{ eventId }}
					to="/events/$eventId/delete"
				>
					Delete event
				</Link>
			</div>

			<header className="mt-7 border-b border-border pb-6">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
					Knock down
				</p>
				<h1 className="mt-2 font-serif text-4xl font-semibold text-foreground">
					{match?.name ?? "Match event"}
				</h1>
				<p className="mt-2 text-muted-foreground">
					Edit this event’s combat record.
				</p>
			</header>

			<Card className="mt-7">
				<CardContent>
					<EventForm
						initialValues={event}
						key={event.id}
						matches={eligibleMatches}
						onSubmit={async (values) => {
							const transaction = events.update(event.id, (draft) => {
								Object.assign(draft, values);
							});
							await transaction.isPersisted.promise;
						}}
						participants={participantRows}
						submitLabel="Save changes"
						warbands={warbandRows}
						warriors={warriorRows}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
