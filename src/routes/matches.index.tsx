import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
	IndexTable,
	IndexTableActions,
	IndexTableBody,
	IndexTableCell,
	IndexTableHead,
	IndexTableHeader,
	IndexTableRow,
} from "../components/index-page";
import { formatStatus } from "../components/match-form";
import { getMatchesCollection } from "../db-collections/matches";

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
				action={<Link to="/matches/new">New match</Link>}
				description="Schedule scenarios and track each encounter through completion."
				eyebrow="Campaign encounters"
				title="Matches"
			/>

			{matches.length ? (
				<IndexTable minWidth={640}>
					<IndexTableHead>
						<IndexTableHeader>Match</IndexTableHeader>
						<IndexTableHeader>Scenario</IndexTableHeader>
						<IndexTableHeader>Status</IndexTableHeader>
						<IndexTableHeader align="right">Actions</IndexTableHeader>
					</IndexTableHead>
					<IndexTableBody>
						{matches.map((match) => (
							<IndexTableRow key={match.id}>
								<IndexTableCell primary>
									<Link params={{ matchId: match.id }} to="/matches/$matchId">
										{match.name}
									</Link>
								</IndexTableCell>
								<IndexTableCell>{match.scenario}</IndexTableCell>
								<IndexTableCell>{formatStatus(match.status)}</IndexTableCell>
								<IndexTableActions>
									<Link params={{ matchId: match.id }} to="/matches/$matchId">
										View
									</Link>
									<Link
										data-danger
										params={{ matchId: match.id }}
										to="/matches/$matchId/delete"
									>
										Delete
									</Link>
								</IndexTableActions>
							</IndexTableRow>
						))}
					</IndexTableBody>
				</IndexTable>
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
