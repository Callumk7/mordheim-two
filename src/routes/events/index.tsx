import { safeRandomUUID, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EventForm } from "#/components/event-form";
import { EventsTable } from "#/components/table/events-table";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
	const [isNewEventOpen, setIsNewEventOpen] = useState(false);
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
		query: (q) =>
			q.from({ match: matchesCollection }).orderBy(({ match }) => match.name),
	});
	const { data: warbands } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbandsCollection })
				.orderBy(({ warband }) => warband.name),
	});
	const matchNames = new Map(matches.map((match) => [match.id, match.name]));
	const warbandNames = new Map(
		warbands.map((warband) => [warband.id, warband.name]),
	);
	const canCreateEvent = matches.length > 0 && warbands.length >= 2;

	return (
		<IndexPage>
			<IndexPageHeader
				action={
					<Button onPress={() => setIsNewEventOpen(true)}>New event</Button>
				}
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
					action={
						<Button variant="link" onPress={() => setIsNewEventOpen(true)}>
							Create an event →
						</Button>
					}
					description="Record the campaign’s first knock down."
					title="No events yet"
				/>
			)}

			<Dialog
				className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"
				isOpen={isNewEventOpen}
				onOpenChange={setIsNewEventOpen}
			>
				<DialogHeader>
					<DialogTitle>New event</DialogTitle>
					<DialogDescription>
						Record a knock down from a campaign match.
					</DialogDescription>
				</DialogHeader>
				{canCreateEvent ? (
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
							setIsNewEventOpen(false);
						}}
						submitLabel="Create event"
						warbands={warbands}
					/>
				) : (
					<section className="rounded-xl border border-dashed border-input px-6 py-10 text-center">
						<h2 className="font-serif text-2xl text-foreground">
							A match and two warbands are required
						</h2>
						<p className="mt-2 text-muted-foreground">
							Create the campaign participants before recording an event.
						</p>
					</section>
				)}
			</Dialog>
		</IndexPage>
	);
}
