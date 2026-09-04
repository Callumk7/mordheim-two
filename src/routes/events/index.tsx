import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useEvents } from "#/db-collections/queries/events";
import { EventForm } from "@/components/event-form";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
} from "@/components/index-page";
import { EventsTable } from "@/components/table/events-table";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { getCollections } from "@/db-collections";
import { createEventTransaction } from "@/db-collections/mutations/events";
import { getParticipantWarbandIds } from "@/lib/event-options";

export const Route = createFileRoute("/events/")({
	component: EventsIndexPage,
});

function EventsIndexPage() {
	const [isNewEventOpen, setIsNewEventOpen] = useState(false);
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const { matches, warbandMatches, warbands, warriors } = collections;
	const eventRows = useEvents(dbClient);
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
	const eligibleMatches = matchRows.filter((match) => {
		const participantIds = getParticipantWarbandIds(match.id, participantRows);
		return (
			participantIds.filter((warbandId) =>
				warriorRows.some((warrior) => warrior.warbandId === warbandId),
			).length >= 2
		);
	});
	const initialMatch = eligibleMatches[0];
	const initialWarbandIds = initialMatch
		? getParticipantWarbandIds(initialMatch.id, participantRows).filter(
				(warbandId) =>
					warriorRows.some((warrior) => warrior.warbandId === warbandId),
			)
		: [];
	const attackerWarbandId = initialWarbandIds[0] ?? "";
	const defenderWarbandId = initialWarbandIds[1] ?? "";

	return (
		<IndexPage>
			<IndexPageHeader
				action={
					<Button onPress={() => setIsNewEventOpen(true)}>New event</Button>
				}
				description="Record knock downs as they happen during each match."
				title="Events"
			/>

			{eventRows.length ? (
				<EventsTable events={eventRows} />
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
				{initialMatch ? (
					<EventForm
						initialValues={{
							matchId: initialMatch.id,
							attackerWarbandId,
							attackerWarriorId:
								warriorRows.find(
									(warrior) => warrior.warbandId === attackerWarbandId,
								)?.id ?? "",
							defenderWarbandId,
							defenderWarriorId:
								warriorRows.find(
									(warrior) => warrior.warbandId === defenderWarbandId,
								)?.id ?? "",
							notes: null,
						}}
						matches={eligibleMatches}
						onSubmit={async (values) => {
							const transaction = createEventTransaction(collections, values);
							await transaction.isPersisted.promise;
							setIsNewEventOpen(false);
						}}
						participants={participantRows}
						submitLabel="Create event"
						warbands={warbandRows}
						warriors={warriorRows}
					/>
				) : (
					<section className="rounded-xl border border-dashed border-input px-6 py-10 text-center">
						<h2 className="font-serif text-2xl text-foreground">
							A match with two staffed warbands is required
						</h2>
						<p className="mt-2 text-muted-foreground">
							Add participating warbands and warriors before recording an event.
						</p>
					</section>
				)}
			</Dialog>
		</IndexPage>
	);
}
