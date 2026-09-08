import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
		<div className="mx-auto max-w-2xl">
			<Link
				className="text-sm text-muted-foreground hover:text-primary/80"
				params={{ eventId }}
				to="/events/$eventId"
			>
				← Cancel
			</Link>
			<section className="mt-7 rounded-xl border border-destructive/50 bg-destructive/10 p-7">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-destructive">
					Historical correction
				</p>
				<h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
					Void this event?
				</h1>
				<p className="mt-3 max-w-xl text-muted-foreground">
					The event remains in history but no longer contributes to combat
					stats. Create a new event afterward if a replacement is needed.
				</p>
				<Field className="mt-6">
					<FieldLabel>Reason</FieldLabel>
					<Textarea
						onChange={(event) => setReason(event.target.value)}
						placeholder="Why is this event being voided?"
						value={reason}
					/>
				</Field>
				<FieldError className="mt-3">{error}</FieldError>
				<div className="mt-7 flex flex-wrap gap-3">
					<Button
						isDisabled={isVoiding || !event || !reason.trim()}
						onPress={async () => {
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
									cause instanceof Error
										? cause.message
										: "Unable to void event.",
								);
								setIsVoiding(false);
							}
						}}
						variant="destructive"
					>
						{isVoiding ? "Voiding…" : "Void event"}
					</Button>
					<Link
						className="rounded-lg border border-input px-5 py-2.5 font-semibold text-foreground hover:border-ring"
						params={{ eventId }}
						to="/events/$eventId"
					>
						Keep event
					</Link>
				</div>
			</section>
		</div>
	);
}
