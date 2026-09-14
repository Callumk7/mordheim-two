import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DestructiveConfirm } from "@/components/shared/entity-chrome";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { getCollections } from "@/db-collections";
import { voidEventTransaction } from "@/db-collections/mutations/events";

export const Route = createFileRoute("/events/$eventId/delete")({
	component: VoidEventPage,
});

function VoidEventPage() {
	const { eventId } = Route.useParams();
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const navigate = useNavigate({ from: Route.fullPath });
	const [reason, setReason] = useState("");
	const [error, setError] = useState<string>();
	const [isVoiding, setIsVoiding] = useState(false);
	const { data } = useLiveQuery({
		query: (q) =>
			q
				.from({ event: collections.events })
				.where(({ event }) => eq(event.id, eventId)),
	});
	const event = data[0];
	if (!event && !isVoiding) return null;

	return (
		<DestructiveConfirm
			cancelLink={{ params: { eventId }, to: "/events/$eventId" }}
			description="The event remains in history but no longer contributes to combat stats. Create a new event afterward if a replacement is needed."
			eyebrow="Historical correction"
			isDisabled={!event || !reason.trim()}
			isPending={isVoiding}
			keepLabel="Keep event"
			onConfirm={async () => {
				setError(undefined);
				setIsVoiding(true);
				try {
					const transaction = voidEventTransaction(
						collections,
						eventId,
						reason,
					);
					await transaction.isPersisted.promise;
					await navigate({ to: "/events" });
				} catch (cause) {
					setError(
						cause instanceof Error ? cause.message : "Unable to void event.",
					);
					setIsVoiding(false);
				}
			}}
			pendingLabel="Voiding…"
			submitLabel="Void event"
			title="Void this event?"
		>
			<Field className="mt-6">
				<FieldLabel htmlFor="void-reason">Reason</FieldLabel>
				<Textarea
					id="void-reason"
					required
					onChange={(event) => setReason(event.target.value)}
					placeholder="Why is this event being voided?"
					value={reason}
				/>
			</Field>
			<FieldError className="mt-3">{error}</FieldError>
		</DestructiveConfirm>
	);
}
