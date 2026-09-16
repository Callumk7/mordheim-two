import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DestructiveConfirm } from "@/components/shared/entity-chrome";
import { getCollections } from "@/db-collections";
import { deleteWarbandTransaction } from "@/db-collections/mutations/warbands";

export const Route = createFileRoute(
	"/campaigns/$campaignId/warbands/$warbandId/delete",
)({
	component: DeleteWarbandPage,
});

function DeleteWarbandPage() {
	const { campaignId, warbandId } = Route.useParams();
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const {
		events,
		warbandMatches,
		warbands: warbandsCollection,
		warriors,
	} = collections;
	const navigate = useNavigate({ from: Route.fullPath });
	const [error, setError] = useState<string>();
	const [isDeleting, setIsDeleting] = useState(false);
	const { data } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbandsCollection })
				.where(({ warband }) => eq(warband.id, warbandId)),
	});
	const { data: participantRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ participant: warbandMatches })
				.where(({ participant }) => eq(participant.warbandId, warbandId)),
	});
	const { data: warriorRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ warrior: warriors })
				.where(({ warrior }) => eq(warrior.warbandId, warbandId)),
	});
	const { data: attackingEvents } = useLiveQuery({
		query: (q) =>
			q
				.from({ event: events })
				.where(({ event }) => eq(event.attackerWarbandId, warbandId)),
	});
	const { data: defendingEvents } = useLiveQuery({
		query: (q) =>
			q
				.from({ event: events })
				.where(({ event }) => eq(event.defenderWarbandId, warbandId)),
	});
	const eventIds = [
		...new Set(
			[...attackingEvents, ...defendingEvents].map((event) => event.id),
		),
	];
	const warband = data[0];

	if (!warband && !isDeleting) return null;

	return (
		<DestructiveConfirm
			cancelLink={{
				params: { campaignId, warbandId },
				to: "/campaigns/$campaignId/warbands/$warbandId",
			}}
			description={
				eventIds.length > 0
					? "This warband cannot be deleted because its event history is retained."
					: `This permanently removes the warband, ${warriorRows.length} warrior${warriorRows.length === 1 ? "" : "s"}, and ${participantRows.length} match link${participantRows.length === 1 ? "" : "s"}. Matches are kept.`
			}
			error={error}
			isDisabled={!warband || eventIds.length > 0}
			isPending={isDeleting}
			keepLabel="Keep warband"
			onConfirm={async () => {
				setError(undefined);
				setIsDeleting(true);
				try {
					const transaction = deleteWarbandTransaction(
						dbClient,
						collections,
						warbandId,
						{
							participantIds: participantRows.map((row) => row.id),
							warriorIds: warriorRows.map((row) => row.id),
							eventIds,
						},
					);
					await transaction.isPersisted.promise;
					await navigate({
						params: { campaignId },
						to: "/campaigns/$campaignId/warbands",
					});
				} catch (cause) {
					setError(
						cause instanceof Error
							? cause.message
							: "Unable to delete warband.",
					);
					setIsDeleting(false);
				}
			}}
			pendingLabel="Deleting…"
			submitLabel={
				eventIds.length > 0
					? "Event history prevents deletion"
					: "Delete warband"
			}
			title={<>Delete {warband?.name ?? "warband"}?</>}
		/>
	);
}
