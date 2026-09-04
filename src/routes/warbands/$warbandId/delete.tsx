import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { getCollections } from "@/db-collections";
import { deleteWarbandTransaction } from "@/db-collections/mutations/warbands";

export const Route = createFileRoute("/warbands/$warbandId/delete")({
	component: DeleteWarbandPage,
});

function DeleteWarbandPage() {
	const { warbandId } = Route.useParams();
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
		<div className="mx-auto max-w-2xl">
			<Link
				className="text-sm text-muted-foreground hover:text-primary/80"
				params={{ warbandId }}
				to="/warbands/$warbandId"
			>
				← Cancel
			</Link>

			<section className="mt-7 rounded-xl border border-destructive/50 bg-destructive/10 p-7">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-destructive">
					Destructive action
				</p>
				<h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
					Delete {warband?.name ?? "warband"}?
				</h1>
				<p className="mt-3 max-w-xl text-muted-foreground">
					This permanently removes the warband, {warriorRows.length} warrior
					{warriorRows.length === 1 ? "" : "s"}, {participantRows.length} match
					link{participantRows.length === 1 ? "" : "s"}, and {eventIds.length}{" "}
					event
					{eventIds.length === 1 ? "" : "s"}. Matches are kept.
				</p>

				{error ? (
					<p className="mt-5 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{error}
					</p>
				) : null}

				<div className="mt-7 flex flex-wrap gap-3">
					<button
						className="rounded-lg bg-destructive px-5 py-2.5 font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={isDeleting || !warband}
						onClick={async () => {
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
								await navigate({ to: "/warbands" });
							} catch (cause) {
								setError(
									cause instanceof Error
										? cause.message
										: "Unable to delete warband.",
								);
								setIsDeleting(false);
							}
						}}
						type="button"
					>
						{isDeleting ? "Deleting…" : "Delete warband"}
					</button>
					<Link
						className="rounded-lg border border-input px-5 py-2.5 font-semibold text-foreground hover:border-ring hover:text-foreground"
						params={{ warbandId }}
						to="/warbands/$warbandId"
					>
						Keep warband
					</Link>
				</div>
			</section>
		</div>
	);
}
