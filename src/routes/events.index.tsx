import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Cell,
	Column,
	Row,
	TableBody,
	TableHeader,
} from "react-aria-components";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
	IndexTable,
} from "../components/index-page";
import { getEventsCollection } from "../db-collections/events";
import { getMatchesCollection } from "../db-collections/matches";
import { getWarbandsCollection } from "../db-collections/warbands";

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
				action={<Link to="/events/new">New event</Link>}
				description="Record knock downs as they happen during each match."
				eyebrow="Campaign action"
				title="Events"
			/>

			{events.length ? (
				<IndexTable aria-label="Events" minWidth={760}>
					<TableHeader>
						<Column isRowHeader>Match</Column>
						<Column>Attacker</Column>
						<Column>Defender</Column>
						<Column>Notes</Column>
						<Column className="text-right">Actions</Column>
					</TableHeader>
					<TableBody>
						{events.map((event) => (
							<Row key={event.id}>
								<Cell className="text-stone-300 [&_a]:font-semibold [&_a]:text-stone-100 [&_a:hover]:text-amber-300">
									<Link params={{ eventId: event.id }} to="/events/$eventId">
										{matchNames.get(event.matchId) ?? "Unknown match"}
									</Link>
								</Cell>
								<Cell className="text-stone-300">
									{warbandNames.get(event.attackerWarbandId) ??
										"Unknown warband"}
								</Cell>
								<Cell className="text-stone-300">
									{warbandNames.get(event.defenderWarbandId) ??
										"Unknown warband"}
								</Cell>
								<Cell className="text-stone-400 max-w-64 truncate">
									{event.notes || "—"}
								</Cell>
								<Cell className="text-stone-300">
									<div className="flex justify-end gap-3 [&_a]:text-stone-400 [&_a:hover]:text-stone-100 [&_a[data-danger]]:text-rose-400/80 [&_a[data-danger]:hover]:text-rose-300">
										<Link params={{ eventId: event.id }} to="/events/$eventId">
											View
										</Link>
										<Link
											data-danger
											params={{ eventId: event.id }}
											to="/events/$eventId/delete"
										>
											Delete
										</Link>
									</div>
								</Cell>
							</Row>
						))}
					</TableBody>
				</IndexTable>
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
