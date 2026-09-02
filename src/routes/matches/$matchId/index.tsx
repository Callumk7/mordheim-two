import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MatchForm } from "../../../components/match-form";
import { Card, CardContent } from "../../../components/ui/card";
import { getMatchesCollection } from "../../../db-collections/matches";

export const Route = createFileRoute("/matches/$matchId/")({
	component: MatchDetailPage,
});

function MatchDetailPage() {
	const { matchId } = Route.useParams();
	const { queryClient } = Route.useRouteContext();
	const matchesCollection = getMatchesCollection(queryClient);
	const { data } = useLiveQuery({
		query: (q) =>
			q
				.from({ match: matchesCollection })
				.where(({ match }) => eq(match.id, matchId)),
	});
	const match = data[0];

	if (!match) return null;

	return (
		<div className="mx-auto max-w-3xl">
			<div className="flex items-center justify-between gap-4">
				<Link
					className="text-sm text-muted-foreground hover:text-primary/80"
					to="/matches"
				>
					← Matches
				</Link>
				<Link
					className="text-sm text-destructive/80 hover:text-destructive"
					params={{ matchId }}
					to="/matches/$matchId/delete"
				>
					Delete match
				</Link>
			</div>

			<header className="mt-7 border-b border-border pb-6">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
					{match.scenario}
				</p>
				<h1 className="mt-2 font-serif text-4xl font-semibold text-foreground">
					{match.name}
				</h1>
				<p className="mt-2 text-muted-foreground">
					Edit this match’s campaign record.
				</p>
			</header>

			<Card className="mt-7">
				<CardContent>
					<MatchForm
						initialValues={match}
						key={match.id}
						onSubmit={async (values) => {
							const transaction = matchesCollection.update(
								match.id,
								(draft) => {
									Object.assign(draft, values);
								},
							);
							await transaction.isPersisted.promise;
						}}
						submitLabel="Save changes"
					/>
				</CardContent>
			</Card>
		</div>
	);
}
