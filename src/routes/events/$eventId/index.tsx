import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { EventForm } from "@/components/event-form";
import { EventImage } from "@/components/event-image";
import { EventOutcomeForm } from "@/components/event-outcome-form";
import { Card, CardContent } from "@/components/ui/card";
import { getCollections } from "@/db-collections";
import {
	setEventOutcomeTransaction,
	updateEventTransaction,
} from "@/db-collections/mutations/events";
import { getParticipantWarbandIds } from "@/lib/event-options";
import { getEventImage } from "@/server/event-images";

export const Route = createFileRoute("/events/$eventId/")({
	loader: ({ params }) => getEventImage({ data: { eventId: params.eventId } }),
	component: EventDetailPage,
});

function EventDetailPage() {
	const { eventId } = Route.useParams();
	const image = Route.useLoaderData();
	const router = useRouter();
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const { events, matches, warbandMatches, warbands, warriors } = collections;
	const { data: eventRows } = useLiveQuery({
		query: (q) =>
			q.from({ event: events }).where(({ event }) => eq(event.id, eventId)),
	});
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
	const event = eventRows[0];
	const match = matchRows.find((candidate) => candidate.id === event?.matchId);
	const attacker = warriorRows.find(
		(candidate) => candidate.id === event?.attackerWarriorId,
	);
	const defender = warriorRows.find(
		(candidate) => candidate.id === event?.defenderWarriorId,
	);
	const eligibleMatches = matchRows.filter((candidate) => {
		const participantIds = getParticipantWarbandIds(
			candidate.id,
			participantRows,
		);
		return (
			participantIds.filter((warbandId) =>
				warriorRows.some((warrior) => warrior.warbandId === warbandId),
			).length >= 2
		);
	});

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
				{event.voidedAt === null ? (
					<Link
						className="text-sm text-destructive/80 hover:text-destructive"
						params={{ eventId }}
						to="/events/$eventId/delete"
					>
						Void event
					</Link>
				) : null}
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
				<CardContent className="grid gap-8">
					{event.voidedAt ? (
						<p className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
							Voided: {event.voidReason}
						</p>
					) : (
						<EventOutcomeForm
							isResolved={event.outcome !== null && event.resolvedAt !== null}
							onSubmit={async (outcome) => {
								const transaction = setEventOutcomeTransaction(
									collections,
									event.id,
									outcome,
								);
								await transaction.isPersisted.promise;
								await router.invalidate({ sync: true });
							}}
							outcome={event.outcome}
						/>
					)}
					{event.outcome === null && event.voidedAt === null ? (
						<div className="border-t border-border pt-8">
							<EventForm
								initialValues={event}
								key={event.id}
								matches={eligibleMatches}
								onSubmit={async (values) => {
									const transaction = updateEventTransaction(
										collections,
										event.id,
										values,
									);
									await transaction.isPersisted.promise;
								}}
								participants={participantRows}
								submitLabel="Save changes"
								warbands={warbandRows}
								warriors={warriorRows}
							/>
						</div>
					) : null}
				</CardContent>
			</Card>

			<EventImage
				attackerName={attacker?.name ?? "The attacker"}
				defenderName={defender?.name ?? "the defender"}
				image={image}
				outcome={event.outcome}
			/>
		</div>
	);
}
