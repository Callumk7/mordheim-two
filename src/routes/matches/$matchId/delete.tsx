import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { getCollections } from "@/db-collections";
import { deleteMatchTransaction } from "@/db-collections/actions";

export const Route = createFileRoute("/matches/$matchId/delete")({
	component: DeleteMatchPage,
});

function DeleteMatchPage() {
	const { matchId } = Route.useParams();
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
		<div className="mx-auto max-w-2xl">
			<Link
				className="text-sm text-muted-foreground hover:text-primary/80"
				params={{ matchId }}
				to="/matches/$matchId"
			>
				← Cancel
			</Link>

			<section className="mt-7 rounded-xl border border-destructive/50 bg-destructive/10 p-7">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-destructive">
					Destructive action
				</p>
				<h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
					Delete {match?.name ?? "match"}?
				</h1>
				<p className="mt-3 max-w-xl text-muted-foreground">
					This permanently removes the match, {participantRows.length}{" "}
					participant
					{participantRows.length === 1 ? " link" : " links"}, and{" "}
					{eventRows.length}
					event{eventRows.length === 1 ? "" : "s"}. Warbands and warriors are
					kept.
				</p>

				{error ? (
					<p className="mt-5 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{error}
					</p>
				) : null}

				<div className="mt-7 flex flex-wrap gap-3">
					<button
						className="rounded-lg bg-destructive px-5 py-2.5 font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={isDeleting || !match}
						onClick={async () => {
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
								await navigate({ to: "/matches" });
							} catch (cause) {
								setError(
									cause instanceof Error
										? cause.message
										: "Unable to delete match.",
								);
								setIsDeleting(false);
							}
						}}
						type="button"
					>
						{isDeleting ? "Deleting…" : "Delete match"}
					</button>
					<Link
						className="rounded-lg border border-input px-5 py-2.5 font-semibold text-foreground hover:border-ring hover:text-foreground"
						params={{ matchId }}
						to="/matches/$matchId"
					>
						Keep match
					</Link>
				</div>
			</section>
		</div>
	);
}
