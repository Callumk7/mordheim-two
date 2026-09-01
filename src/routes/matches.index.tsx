import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
} from "../components/index-page";
import { formatStatus } from "../components/match-form";
import {
	Cell,
	Column,
	Row,
	Table,
	TableActions,
	TableBody,
	TableContainer,
	TableHeader,
	TablePrimaryCell,
} from "../components/ui/table";
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
				<TableContainer>
					<Table aria-label="Matches" minWidth={640}>
						<TableHeader>
							<Column isRowHeader>Match</Column>
							<Column>Scenario</Column>
							<Column>Status</Column>
							<Column className="text-right">Actions</Column>
						</TableHeader>
						<TableBody>
							{matches.map((match) => (
								<Row key={match.id}>
									<TablePrimaryCell>
										<Link params={{ matchId: match.id }} to="/matches/$matchId">
											{match.name}
										</Link>
									</TablePrimaryCell>
									<Cell>{match.scenario}</Cell>
									<Cell>{formatStatus(match.status)}</Cell>
									<TableActions>
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
									</TableActions>
								</Row>
							))}
						</TableBody>
					</Table>
				</TableContainer>
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
