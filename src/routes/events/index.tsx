import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EventsTable } from "#/components/table/events-table";
import { LinkButton } from "@/components/ui/button";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
} from "../../components/index-page";
import { getEventsCollection } from "../../db-collections/events";
import { getMatchesCollection } from "../../db-collections/matches";
import { getWarbandsCollection } from "../../db-collections/warbands";

export const Route = createFileRoute("/events/")({
	component: EventsIndexPage,
});

function EventsIndexPage() {
	const { queryClient } = Route.useRouteContext();
	const eventsCollection = getEventsCollection(queryClient);
	const matchesCollection = getMatchesCollection(queryClient);
	const warbandsCollection = getWarbandsCollection(queryClient);
	const { data: events } = useLiveQuery({
		query: (q) =>
			q
				.from({ event: eventsCollection })
				.orderBy(({ event }) => event.createdAt, "desc"),
	});
	const { data: matches } = useLiveQuery({
		query: (q) => q.from({ match: matchesCollection }),
	});
	const { data: warbands } = useLiveQuery({
		query: (q) => q.from({ warband: warbandsCollection }),
	});
	const matchNames = new Map(matches.map((match) => [match.id, match.name]));
	const warbandNames = new Map(
		warbands.map((warband) => [warband.id, warband.name]),
	);

	return (
		<IndexPage>
			<IndexPageHeader
				action={<LinkButton to="/events/new">New event</LinkButton>}
				description="Record knock downs as they happen during each match."
				eyebrow="Campaign action"
				title="Events"
			/>

			{events.length ? (
				<EventsTable
					events={events}
					matchNames={matchNames}
					warbandNames={warbandNames}
				/>
			) : (
				<IndexEmptyState
					action={<Link to="/events/new">Create an event →</Link>}
					description="Record the campaign’s first knock down."
					title="No events yet"
				/>
			)}
		</IndexPage>
	);
}
