import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MatchesTable } from "#/components/table/matches-table";
import { LinkButton } from "@/components/ui/button";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
} from "../../components/index-page";
import { getMatchesCollection } from "../../db-collections/matches";

export const Route = createFileRoute("/matches/")({
	component: MatchesIndexPage,
});

function MatchesIndexPage() {
	const { queryClient } = Route.useRouteContext();
	const matchesCollection = getMatchesCollection(queryClient);
	const { data: matches } = useLiveQuery({
		query: (q) =>
			q
				.from({ match: matchesCollection })
				.orderBy(({ match }) => match.createdAt, "desc"),
	});

	return (
		<IndexPage>
			<IndexPageHeader
				action={<LinkButton to="/matches/new">New match</LinkButton>}
				description="Schedule scenarios and track each encounter through completion."
				eyebrow="Campaign encounters"
				title="Matches"
			/>

			{matches.length ? (
				<MatchesTable matches={matches} />
			) : (
				<IndexEmptyState
					action={<Link to="/matches/new">Create a match →</Link>}
					description="Schedule the campaign’s first encounter."
					title="No matches yet"
				/>
			)}
		</IndexPage>
	);
}
