import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useEvents } from "#/db-collections/queries/events";
import { EventForm } from "@/components/event-form";
import { EmptyState } from "@/components/shared/empty-state";
import { IndexPage, IndexPageHeader } from "@/components/shared/index-page";
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

export const Route = createFileRoute("/campaigns/$campaignId/events/")({
	component: EventsIndexPage,
});

function EventsIndexPage() {
	const [isNewEventOpen, setIsNewEventOpen] = useState(false);
	const { campaignId } = Route.useParams();
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const { matches, warbandMatches, warbands, warriors } = collections;
	const eventRows = useEvents(dbClient, campaignId);
	const { data: matchRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ match: matches })
				.where(({ match }) => eq(match.campaignId, campaignId))
				.orderBy(({ match }) => match.name),
	});
	const { data: participantRows } = useLiveQuery({
		query: (q) => q.from({ participant: warbandMatches }),
	});
	const { data: warbandRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbands })
				.where(({ warband }) => eq(warband.campaignId, campaignId))
				.orderBy(({ warband }) => warband.name),
	});
	const { data: warriorRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ warrior: warriors })
				.where(({ warrior }) => eq(warrior.campaignId, campaignId))
				.orderBy(({ warrior }) => warrior.name),
	});
	const activeWarbandRows = warbandRows.filter(
		(warband) => !warband.isArchived,
	);
	const activeWarriorRows = warriorRows.filter(
		(warrior) =>
			!warrior.isArchived &&
			activeWarbandRows.some((warband) => warband.id === warrior.warbandId),
	);
	const eligibleMatches = matchRows.filter((match) => {
		const participantIds = getParticipantWarbandIds(match.id, participantRows);
		return (
			participantIds.filter((warbandId) =>
				activeWarriorRows.some((warrior) => warrior.warbandId === warbandId),
			).length >= 2
		);
	});
	const initialMatch = eligibleMatches[0];
	const initialWarbandIds = initialMatch
		? getParticipantWarbandIds(initialMatch.id, participantRows).filter(
				(warbandId) =>
					activeWarriorRows.some((warrior) => warrior.warbandId === warbandId),
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
				<EventsTable campaignId={campaignId} events={eventRows} />
			) : (
				<EmptyState
					action={
						<Button variant="link" onPress={() => setIsNewEventOpen(true)}>
							Create an event →
						</Button>
					}
					description="Record the campaign’s first knock down."
					title="No events yet"
				/>
			)}

			<Dialog isOpen={isNewEventOpen} onOpenChange={setIsNewEventOpen}>
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
								activeWarriorRows.find(
									(warrior) => warrior.warbandId === attackerWarbandId,
								)?.id ?? "",
							defenderWarbandId,
							defenderWarriorId:
								activeWarriorRows.find(
									(warrior) => warrior.warbandId === defenderWarbandId,
								)?.id ?? "",
							notes: null,
						}}
						matches={eligibleMatches}
						onSubmit={async (values) => {
							const transaction = createEventTransaction(collections, {
								...values,
								campaignId,
							});
							await transaction.isPersisted.promise;
							setIsNewEventOpen(false);
						}}
						participants={participantRows}
						submitLabel="Create event"
						warbands={activeWarbandRows}
						warriors={activeWarriorRows}
					/>
				) : (
					<EmptyState
						description="Add participating warbands and warriors before recording an event."
						title="A match with two staffed warbands is required"
						variant="dialog"
					/>
				)}
			</Dialog>
		</IndexPage>
	);
}
