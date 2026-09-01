import { safeRandomUUID } from "@tanstack/react-db";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MatchForm, type MatchFormValues } from "../components/match-form";
import { getMatchesCollection } from "../db-collections/matches";

export const Route = createFileRoute("/matches/new")({
	component: NewMatchPage,
});

const initialValues: MatchFormValues = {
	name: "",
	scenario: "",
	status: "Scheduled",
};

function NewMatchPage() {
	const { queryClient } = Route.useRouteContext();
	const matchesCollection = getMatchesCollection(queryClient);
	const navigate = useNavigate({ from: Route.fullPath });

	return (
		<div className="mx-auto max-w-3xl">
			<Link
				className="text-sm text-muted-foreground hover:text-primary/80"
				to="/matches"
			>
				← Matches
			</Link>
			<header className="mt-7 border-b border-border pb-6">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
					Encounter planning
				</p>
				<h1 className="mt-2 font-serif text-4xl font-semibold text-foreground">
					New match
				</h1>
				<p className="mt-2 text-muted-foreground">
					Schedule a new campaign encounter.
				</p>
			</header>

			<section className="mt-7 rounded-xl border border-border bg-card p-6">
				<MatchForm
					initialValues={initialValues}
					onSubmit={async (values) => {
						const id = safeRandomUUID();
						const transaction = matchesCollection.insert({ id, ...values });
						await transaction.isPersisted.promise;
						await navigate({
							to: "/matches/$matchId",
							params: { matchId: id },
						});
					}}
					submitLabel="Create match"
				/>
			</section>
		</div>
	);
}
