import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EventForm } from "../../../components/event-form";
import { Card, CardContent } from "../../../components/ui/card";
import { getEventsCollection } from "../../../db-collections/events";
import { getMatchesCollection } from "../../../db-collections/matches";
import { getWarbandsCollection } from "../../../db-collections/warbands";

export const Route = createFileRoute("/events/$eventId/")({
	component: EventDetailPage,
});

function EventDetailPage() {
	const { eventId } = Route.useParams();
	const { queryClient } = Route.useRouteContext();
	const eventsCollection = getEventsCollection(queryClient);
	const matchesCollection = getMatchesCollection(queryClient);
	const warbandsCollection = getWarbandsCollection(queryClient);
	const { data: events } = useLiveQuery({
		query: (q) =>
			q
				.from({ event: eventsCollection })
				.where(({ event }) => eq(event.id, eventId)),
	});
	const { data: matches } = useLiveQuery({
		query: (q) =>
			q.from({ match: matchesCollection }).orderBy(({ match }) => match.name),
	});
	const { data: warbands } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbandsCollection })
				.orderBy(({ warband }) => warband.name),
	});
	const event = events[0];
	const match = matches.find((candidate) => candidate.id === event?.matchId);

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
						matches={matches}
						onSubmit={async (values) => {
							const transaction = eventsCollection.update(event.id, (draft) => {
								Object.assign(draft, values);
							});
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
