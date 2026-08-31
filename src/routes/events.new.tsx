import { safeRandomUUID, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { EventForm } from "../components/event-form";
import { getEventsCollection } from "../db-collections/events";
import { getMatchesCollection } from "../db-collections/matches";
import { getWarbandsCollection } from "../db-collections/warbands";

export const Route = createFileRoute("/events/new")({
	component: NewEventPage,
});

function NewEventPage() {
	const { queryClient } = Route.useRouteContext();
	const eventsCollection = getEventsCollection(queryClient);
	const matchesCollection = getMatchesCollection(queryClient);
	const warbandsCollection = getWarbandsCollection(queryClient);
	const navigate = useNavigate({ from: Route.fullPath });
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

	return (
		<div className="mx-auto max-w-3xl">
			<Link
				className="text-sm text-stone-500 hover:text-amber-300"
				to="/events"
			>
				← Events
			</Link>
			<header className="mt-7 border-b border-stone-800 pb-6">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400">
					Combat record
				</p>
				<h1 className="mt-2 font-serif text-4xl font-semibold text-stone-100">
					New event
				</h1>
				<p className="mt-2 text-stone-400">
					Record a knock down from a campaign match.
				</p>
			</header>

			{matches.length && warbands.length >= 2 ? (
				<section className="mt-7 rounded-xl border border-stone-800 bg-stone-900/40 p-6">
					<EventForm
						initialValues={{
							matchId: matches[0]?.id ?? "",
							attackerWarbandId: warbands[0]?.id ?? "",
							defenderWarbandId: warbands[1]?.id ?? warbands[0]?.id ?? "",
							notes: null,
						}}
						matches={matches}
						onSubmit={async (values) => {
							const id = safeRandomUUID();
							const transaction = eventsCollection.insert({ id, ...values });
							await transaction.isPersisted.promise;
							await navigate({
								to: "/events/$eventId",
								params: { eventId: id },
							});
						}}
						submitLabel="Create event"
						warbands={warbands}
					/>
				</section>
			) : (
				<section className="mt-7 rounded-xl border border-dashed border-stone-700 px-6 py-12 text-center">
					<h2 className="font-serif text-2xl text-stone-100">
						A match and two warbands are required
					</h2>
					<p className="mt-2 text-stone-500">
						Create the campaign participants before recording an event.
					</p>
				</section>
			)}
		</div>
	);
}
