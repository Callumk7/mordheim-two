import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Cell,
	Column,
	Row,
	TableBody,
	TableHeader,
} from "react-aria-components";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
	IndexTable,
	IndexTableActions,
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
				<IndexTable aria-label="Matches" minWidth={640}>
					<TableHeader>
						<Column isRowHeader>Match</Column>
						<Column>Scenario</Column>
						<Column>Status</Column>
						<Column className="text-right">Actions</Column>
					</TableHeader>
					<TableBody>
						{matches.map((match) => (
							<Row key={match.id}>
								<Cell className="text-stone-300 [&_a]:font-semibold [&_a]:text-stone-100 [&_a:hover]:text-amber-300">
									<Link params={{ matchId: match.id }} to="/matches/$matchId">
										{match.name}
									</Link>
								</Cell>
								<Cell className="text-stone-300">{match.scenario}</Cell>
								<Cell className="text-stone-300">
									{formatStatus(match.status)}
								</Cell>
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
							</Row>
						))}
					</TableBody>
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
