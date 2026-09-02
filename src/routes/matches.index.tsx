import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LinkButton } from "@/components/ui/button";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
} from "../components/index-page";
import { formatStatus } from "../components/match-form";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
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
				action={<LinkButton to="/matches/new">New match</LinkButton>}
				description="Schedule scenarios and track each encounter through completion."
				eyebrow="Campaign encounters"
				title="Matches"
			/>

			{matches.length ? (
				<div className="overflow-hidden rounded-xl border border-border bg-card">
					<Table aria-label="Matches" className="min-w-[640px]">
						<TableHeader>
							<TableHead isRowHeader>Match</TableHead>
							<TableHead>Scenario</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableHeader>
						<TableBody>
							{matches.map((match) => (
								<TableRow key={match.id}>
									<TableCell className="[&_a]:font-semibold [&_a]:text-foreground [&_a:hover]:text-primary">
										<Link params={{ matchId: match.id }} to="/matches/$matchId">
											{match.name}
										</Link>
									</TableCell>
									<TableCell>{match.scenario}</TableCell>
									<TableCell>{formatStatus(match.status)}</TableCell>
									<TableCell>
										<div className="flex justify-end gap-3 [&_a]:text-muted-foreground [&_a:hover]:text-foreground [&_a[data-danger]]:text-destructive/80 [&_a[data-danger]:hover]:text-destructive">
											<Link
												params={{ matchId: match.id }}
												to="/matches/$matchId"
											>
												View
											</Link>
											<Link
												data-danger
												params={{ matchId: match.id }}
												to="/matches/$matchId/delete"
											>
												Delete
											</Link>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
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
