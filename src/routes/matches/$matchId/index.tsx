import { eq, safeRandomUUID, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MatchForm } from "@/components/match-form";
import { Card, CardContent } from "@/components/ui/card";
import { getCollections } from "@/db-collections";
import { updateMatchTransaction } from "@/db-collections/actions";

export const Route = createFileRoute("/matches/$matchId/")({
	component: MatchDetailPage,
});

function MatchDetailPage() {
	const { matchId } = Route.useParams();
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const { events, matches, warbandMatches, warbands } = collections;
	const { data: matchRows } = useLiveQuery({
		query: (q) =>
			q.from({ match: matches }).where(({ match }) => eq(match.id, matchId)),
	});
	const { data: participantRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ participant: warbandMatches })
				.where(({ participant }) => eq(participant.matchId, matchId)),
	});
	const { data: eventRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ event: events })
				.where(({ event }) => eq(event.matchId, matchId)),
	});
	const { data: warbandRows } = useLiveQuery({
		query: (q) =>
			q.from({ warband: warbands }).orderBy(({ warband }) => warband.name),
	});
	const lockedParticipantWarbandIds = [
		...new Set(
			eventRows.flatMap((event) => [
				event.attackerWarbandId,
				event.defenderWarbandId,
			]),
		),
	];
	const match = matchRows[0];

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
					Edit this match and its participating warbands.
				</p>
			</header>

			<Card className="mt-7">
				<CardContent>
					<MatchForm
						initialValues={{
							...match,
							participantWarbandIds: participantRows.map(
								(participant) => participant.warbandId,
							),
						}}
						key={`${match.id}:${participantRows.map((row) => row.id).join(",")}`}
						lockedParticipantWarbandIds={lockedParticipantWarbandIds}
						onSubmit={async ({ participantWarbandIds, ...changes }) => {
							const selectedIds = new Set(participantWarbandIds);
							const existingIds = new Set(
								participantRows.map((participant) => participant.warbandId),
							);
							const now = new Date().toISOString();
							const additions = participantWarbandIds
								.filter((warbandId) => !existingIds.has(warbandId))
								.map((warbandId) => ({
									id: safeRandomUUID(),
									matchId,
									warbandId,
									createdAt: now,
									updatedAt: now,
								}));
							const removals = participantRows.filter(
								(participant) => !selectedIds.has(participant.warbandId),
							);
							const transaction = updateMatchTransaction(
								dbClient,
								collections,
								{ id: matchId, changes, additions, removals },
							);
							await transaction.isPersisted.promise;
						}}
						submitLabel="Save changes"
						warbands={warbandRows}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
