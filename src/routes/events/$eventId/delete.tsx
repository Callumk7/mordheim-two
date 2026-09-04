import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { getCollections } from "@/db-collections";
import { deleteEventTransaction } from "@/db-collections/mutations/events";

export const Route = createFileRoute("/events/$eventId/delete")({
	component: DeleteEventPage,
});

function DeleteEventPage() {
	const { eventId } = Route.useParams();
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const { events: eventsCollection } = collections;
	const navigate = useNavigate({ from: Route.fullPath });
	const [error, setError] = useState<string>();
	const [isDeleting, setIsDeleting] = useState(false);
	const { data } = useLiveQuery({
		query: (q) =>
			q
				.from({ event: eventsCollection })
				.where(({ event }) => eq(event.id, eventId)),
	});
	const event = data[0];

	if (!event && !isDeleting) return null;

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
					Destructive action
				</p>
				<h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
					Delete this event?
				</h1>
				<p className="mt-3 max-w-xl text-muted-foreground">
					This permanently removes the knock down from the match record. This
					action cannot be undone.
				</p>

				{error ? (
					<p className="mt-5 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{error}
					</p>
				) : null}

				<div className="mt-7 flex flex-wrap gap-3">
					<button
						className="rounded-lg bg-destructive px-5 py-2.5 font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={isDeleting || !event}
						onClick={async () => {
							setError(undefined);
							setIsDeleting(true);
							try {
								const transaction = deleteEventTransaction(
									collections,
									eventId,
								);
								await transaction.isPersisted.promise;
								await navigate({ to: "/events" });
							} catch (cause) {
								setError(
									cause instanceof Error
										? cause.message
										: "Unable to delete event.",
								);
								setIsDeleting(false);
							}
						}}
						type="button"
					>
						{isDeleting ? "Deleting…" : "Delete event"}
					</button>
					<Link
						className="rounded-lg border border-input px-5 py-2.5 font-semibold text-foreground hover:border-ring hover:text-foreground"
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
