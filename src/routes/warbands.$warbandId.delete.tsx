import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { getWarbandsCollection } from "../db-collections/warbands";

export const Route = createFileRoute("/warbands/$warbandId/delete")({
	component: DeleteWarbandPage,
});

function DeleteWarbandPage() {
	const { warbandId } = Route.useParams();
	const { queryClient } = Route.useRouteContext();
	const warbandsCollection = getWarbandsCollection(queryClient);
	const navigate = useNavigate({ from: Route.fullPath });
	const [error, setError] = useState<string>();
	const [isDeleting, setIsDeleting] = useState(false);
	const { data } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbandsCollection })
				.where(({ warband }) => eq(warband.id, warbandId)),
	});
	const warband = data[0];

	if (!warband && !isDeleting) return null;

	return (
		<div className="mx-auto max-w-2xl">
			<Link
				className="text-sm text-stone-500 hover:text-amber-300"
				params={{ warbandId }}
				to="/warbands/$warbandId"
			>
				← Cancel
			</Link>

			<section className="mt-7 rounded-xl border border-rose-900/60 bg-rose-950/20 p-7">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-400">
					Destructive action
				</p>
				<h1 className="mt-3 font-serif text-4xl font-semibold text-stone-100">
					Delete {warband?.name ?? "warband"}?
				</h1>
				<p className="mt-3 max-w-xl text-stone-400">
					This permanently removes the warband and its campaign record. This
					action cannot be undone.
				</p>

				{error ? (
					<p className="mt-5 rounded-lg border border-rose-900 bg-rose-950/60 px-4 py-3 text-sm text-rose-300">
						{error}
					</p>
				) : null}

				<div className="mt-7 flex flex-wrap gap-3">
					<button
						className="rounded-lg bg-rose-500 px-5 py-2.5 font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={isDeleting || !warband}
						onClick={async () => {
							setError(undefined);
							setIsDeleting(true);
							try {
								const transaction = warbandsCollection.delete(warbandId);
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
						className="rounded-lg border border-stone-700 px-5 py-2.5 font-semibold text-stone-300 hover:border-stone-500 hover:text-stone-100"
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
