import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
	IndexTable,
	IndexTableActions,
	IndexTableBody,
	IndexTableCell,
	IndexTableHead,
	IndexTableHeader,
	IndexTableRow,
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
				<IndexTable minWidth={760}>
					<IndexTableHead>
						<IndexTableHeader>Match</IndexTableHeader>
						<IndexTableHeader>Attacker</IndexTableHeader>
						<IndexTableHeader>Defender</IndexTableHeader>
						<IndexTableHeader>Notes</IndexTableHeader>
						<IndexTableHeader align="right">Actions</IndexTableHeader>
					</IndexTableHead>
					<IndexTableBody>
						{events.map((event) => (
							<IndexTableRow key={event.id}>
								<IndexTableCell primary>
									<Link params={{ eventId: event.id }} to="/events/$eventId">
										{matchNames.get(event.matchId) ?? "Unknown match"}
									</Link>
								</IndexTableCell>
								<IndexTableCell>
									{warbandNames.get(event.attackerWarbandId) ??
										"Unknown warband"}
								</IndexTableCell>
								<IndexTableCell>
									{warbandNames.get(event.defenderWarbandId) ??
										"Unknown warband"}
								</IndexTableCell>
								<IndexTableCell className="max-w-64 truncate" tone="muted">
									{event.notes || "—"}
								</IndexTableCell>
								<IndexTableActions>
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
								</IndexTableActions>
							</IndexTableRow>
						))}
					</IndexTableBody>
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
