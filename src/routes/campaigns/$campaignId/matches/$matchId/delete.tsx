import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DestructiveConfirm } from "@/components/shared/entity-chrome";
import { getCollections } from "@/db-collections";
import { deleteMatchTransaction } from "@/db-collections/mutations/matches";

export const Route = createFileRoute(
	"/campaigns/$campaignId/matches/$matchId/delete",
)({
	component: DeleteMatchPage,
});

function DeleteMatchPage() {
	const { campaignId, matchId } = Route.useParams();
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const {
		events: eventsCollection,
		matches: matchesCollection,
		warbandMatches,
	} = collections;
	const navigate = useNavigate({ from: Route.fullPath });
	const [error, setError] = useState<string>();
	const [isDeleting, setIsDeleting] = useState(false);
	const { data } = useLiveQuery({
		query: (q) =>
			q
				.from({ match: matchesCollection })
				.where(({ match }) => eq(match.id, matchId)),
	});
	const { data: participantRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ participant: warbandMatches })
				.where(({ participant }) => eq(participant.matchId, matchId)),
	});
	const { data: eventRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ event: eventsCollection })
				.where(({ event }) => eq(event.matchId, matchId)),
	});
	const match = data[0];

	if (!match && !isDeleting) return null;

	return (
		<DestructiveConfirm
			cancelLink={{
				params: { campaignId, matchId },
				to: "/campaigns/$campaignId/matches/$matchId",
			}}
			description={
				eventRows.length > 0
					? "This match cannot be deleted because its event history is retained."
					: `This permanently removes the match and ${participantRows.length} participant link${participantRows.length === 1 ? "" : "s"}. Warbands and warriors are kept.`
			}
			error={error}
			isDisabled={!match || eventRows.length > 0}
			isPending={isDeleting}
			keepLabel="Keep match"
			onConfirm={async () => {
				setError(undefined);
				setIsDeleting(true);
				try {
					const transaction = deleteMatchTransaction(
						dbClient,
						collections,
						matchId,
						participantRows.map((participant) => participant.id),
						eventRows.map((event) => event.id),
					);
					await transaction.isPersisted.promise;
					await navigate({
						params: { campaignId },
						to: "/campaigns/$campaignId/matches",
					});
				} catch (cause) {
					setError(
						cause instanceof Error ? cause.message : "Unable to delete match.",
					);
					setIsDeleting(false);
				}
			}}
			pendingLabel="Deleting…"
			submitLabel={
				eventRows.length > 0
					? "Event history prevents deletion"
					: "Delete match"
			}
			title={<>Delete {match?.name ?? "match"}?</>}
		/>
	);
}
