import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useWarriorMutations } from "@/db-collections/mutations/warriors";
import { useWarriorDeletion } from "@/db-collections/queries";

export const Route = createFileRoute("/warriors/$warriorId/delete")({
	component: DeleteWarriorPage,
});

function DeleteWarriorPage() {
	const { warriorId } = Route.useParams();
	const { dbClient } = Route.useRouteContext();
	const navigate = useNavigate({ from: Route.fullPath });
	const [error, setError] = useState<string>();
	const [isDeleting, setIsDeleting] = useState(false);
	const { removeWarrior } = useWarriorMutations(dbClient);
	const { eventIds, warrior } = useWarriorDeletion(dbClient, warriorId);

	if (!warrior && !isDeleting) return null;

	return (
		<div className="mx-auto max-w-2xl">
			<Link
				className="text-sm text-muted-foreground hover:text-primary/80"
				params={{ warriorId }}
				to="/warriors/$warriorId"
			>
				← Cancel
			</Link>

			<section className="mt-7 rounded-xl border border-destructive/50 bg-destructive/10 p-7">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-destructive">
					Destructive action
				</p>
				<h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
					Delete {warrior?.name ?? "warrior"}?
				</h1>
				<p className="mt-3 max-w-xl text-muted-foreground">
					{eventIds.length > 0
						? "This warrior cannot be deleted because their event history is retained."
						: "This permanently removes the warrior. This action cannot be undone."}
				</p>

				{error ? (
					<p className="mt-5 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{error}
					</p>
				) : null}

				<div className="mt-7 flex flex-wrap gap-3">
					<button
						className="rounded-lg bg-destructive px-5 py-2.5 font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={isDeleting || !warrior || eventIds.length > 0}
						onClick={async () => {
							setError(undefined);
							setIsDeleting(true);
							try {
								await removeWarrior(warriorId, eventIds);
								await navigate({ to: "/warriors" });
							} catch (cause) {
								setError(
									cause instanceof Error
										? cause.message
										: "Unable to delete warrior.",
								);
								setIsDeleting(false);
							}
						}}
						type="button"
					>
						{eventIds.length > 0
							? "Event history prevents deletion"
							: isDeleting
								? "Deleting…"
								: "Delete warrior"}
					</button>
					<Link
						className="rounded-lg border border-input px-5 py-2.5 font-semibold text-foreground hover:border-ring hover:text-foreground"
						params={{ warriorId }}
						to="/warriors/$warriorId"
					>
						Keep warrior
					</Link>
				</div>
			</section>
		</div>
	);
}
