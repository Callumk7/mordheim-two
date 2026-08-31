import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EventForm } from "../components/event-form";
import { getEventsCollection } from "../db-collections/events";
import { getMatchesCollection } from "../db-collections/matches";
import { getWarbandsCollection } from "../db-collections/warbands";

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
					className="text-sm text-stone-500 hover:text-amber-300"
					to="/events"
				>
					← Events
				</Link>
				<Link
					className="text-sm text-rose-400/80 hover:text-rose-300"
					params={{ eventId }}
					to="/events/$eventId/delete"
				>
					Delete event
				</Link>
			</div>

			<header className="mt-7 border-b border-stone-800 pb-6">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400">
					Knock down
				</p>
				<h1 className="mt-2 font-serif text-4xl font-semibold text-stone-100">
					{match?.name ?? "Match event"}
				</h1>
				<p className="mt-2 text-stone-400">Edit this event’s combat record.</p>
			</header>

			<section className="mt-7 rounded-xl border border-stone-800 bg-stone-900/40 p-6">
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
			</section>
		</div>
	);
}
