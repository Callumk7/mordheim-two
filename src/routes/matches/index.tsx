import { safeRandomUUID, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
} from "@/components/index-page";
import { MatchForm, type MatchFormValues } from "@/components/match-form";
import { MatchesTable } from "@/components/table/matches-table";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { getCollections } from "@/db-collections";
import { createMatchTransaction } from "@/db-collections/mutations/matches";

export const Route = createFileRoute("/matches/")({
	component: MatchesIndexPage,
});

const initialValues: MatchFormValues = {
	name: "",
	scenario: "",
	status: "Scheduled",
	participantWarbandIds: [],
};

function MatchesIndexPage() {
	const [isNewMatchOpen, setIsNewMatchOpen] = useState(false);
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const { matches, warbands } = collections;
	const { data: matchRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ match: matches })
				.orderBy(({ match }) => match.createdAt, "desc"),
	});
	const { data: warbandRows } = useLiveQuery({
		query: (q) =>
			q.from({ warband: warbands }).orderBy(({ warband }) => warband.name),
	});

	return (
		<IndexPage>
			<IndexPageHeader
				action={
					<Button onPress={() => setIsNewMatchOpen(true)}>New match</Button>
				}
				description="Schedule scenarios and track each encounter through completion."
				title="Matches"
			/>

			{matchRows.length ? (
				<MatchesTable matches={matchRows} />
			) : (
				<IndexEmptyState
					action={
						<Button variant="link" onPress={() => setIsNewMatchOpen(true)}>
							Create a match →
						</Button>
					}
					description="Schedule the campaign’s first encounter."
					title="No matches yet"
				/>
			)}

			<Dialog
				className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"
				isOpen={isNewMatchOpen}
				onOpenChange={setIsNewMatchOpen}
			>
				<DialogHeader>
					<DialogTitle>New match</DialogTitle>
					<DialogDescription>
						Schedule a new campaign encounter.
					</DialogDescription>
				</DialogHeader>
				<MatchForm
					initialValues={initialValues}
					onSubmit={async ({ participantWarbandIds, ...values }) => {
						const now = new Date().toISOString();
						const match = {
							id: safeRandomUUID(),
							...values,
							createdAt: now,
							updatedAt: now,
						};
						const participants = participantWarbandIds.map((warbandId) => ({
							id: safeRandomUUID(),
							matchId: match.id,
							warbandId,
							createdAt: now,
							updatedAt: now,
						}));
						const transaction = createMatchTransaction(
							dbClient,
							collections,
							match,
							participants,
						);
						await transaction.isPersisted.promise;
						setIsNewMatchOpen(false);
					}}
					submitLabel="Create match"
					warbands={warbandRows}
				/>
			</Dialog>
		</IndexPage>
	);
}
