import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DestructiveConfirm } from "@/components/shared/entity-chrome";
import { useWarriorMutations } from "@/db-collections/mutations/warriors";
import { useWarriorDeletion } from "@/db-collections/queries";

export const Route = createFileRoute(
	"/campaigns/$campaignId/warriors/$warriorId/delete",
)({
	component: DeleteWarriorPage,
});

function DeleteWarriorPage() {
	const { campaignId, warriorId } = Route.useParams();
	const { dbClient } = Route.useRouteContext();
	const navigate = useNavigate({ from: Route.fullPath });
	const [error, setError] = useState<string>();
	const [isDeleting, setIsDeleting] = useState(false);
	const { removeWarrior } = useWarriorMutations(dbClient);
	const { eventIds, warrior } = useWarriorDeletion(dbClient, warriorId);

	if (!warrior && !isDeleting) return null;

	return (
		<DestructiveConfirm
			cancelLink={{
				params: { campaignId, warriorId },
				to: "/campaigns/$campaignId/warriors/$warriorId",
			}}
			description={
				eventIds.length > 0
					? "This warrior cannot be deleted because their event history is retained."
					: "This permanently removes the warrior. This action cannot be undone."
			}
			error={error}
			isDisabled={!warrior || eventIds.length > 0}
			isPending={isDeleting}
			keepLabel="Keep warrior"
			onConfirm={async () => {
				setError(undefined);
				setIsDeleting(true);
				try {
					await removeWarrior(warriorId, eventIds);
					await navigate({
						params: { campaignId },
						to: "/campaigns/$campaignId/warriors",
					});
				} catch (cause) {
					setError(
						cause instanceof Error
							? cause.message
							: "Unable to delete warrior.",
					);
					setIsDeleting(false);
				}
			}}
			pendingLabel="Deleting…"
			submitLabel={
				eventIds.length > 0
					? "Event history prevents deletion"
					: "Delete warrior"
			}
			title={<>Delete {warrior?.name ?? "warrior"}?</>}
		/>
	);
}
