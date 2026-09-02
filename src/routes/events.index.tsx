import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LinkButton } from "@/components/ui/button";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
} from "../components/index-page";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../components/ui/table";
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
				action={<LinkButton to="/events/new">New event</LinkButton>}
				description="Record knock downs as they happen during each match."
				eyebrow="Campaign action"
				title="Events"
			/>

			{events.length ? (
				<div className="overflow-hidden rounded-xl border border-border bg-card">
					<Table aria-label="Events" className="min-w-[760px]">
						<TableHeader>
							<TableHead isRowHeader>Match</TableHead>
							<TableHead>Attacker</TableHead>
							<TableHead>Defender</TableHead>
							<TableHead>Notes</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableHeader>
						<TableBody>
							{events.map((event) => (
								<TableRow key={event.id}>
									<TableCell className="[&_a]:font-semibold [&_a]:text-foreground [&_a:hover]:text-primary">
										<Link params={{ eventId: event.id }} to="/events/$eventId">
											{matchNames.get(event.matchId) ?? "Unknown match"}
										</Link>
									</TableCell>
									<TableCell>
										{warbandNames.get(event.attackerWarbandId) ??
											"Unknown warband"}
									</TableCell>
									<TableCell>
										{warbandNames.get(event.defenderWarbandId) ??
											"Unknown warband"}
									</TableCell>
									<TableCell className="max-w-64 truncate text-muted-foreground">
										{event.notes || "—"}
									</TableCell>
									<TableCell>
										<div className="flex justify-end gap-3 [&_a]:text-muted-foreground [&_a:hover]:text-foreground [&_a[data-danger]]:text-destructive/80 [&_a[data-danger]:hover]:text-destructive">
											<Link
												params={{ eventId: event.id }}
												to="/events/$eventId"
											>
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
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
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
