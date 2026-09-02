import { safeRandomUUID, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MatchForm, type MatchFormValues } from "#/components/match-form";
import { MatchesTable } from "#/components/table/matches-table";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
} from "../../components/index-page";
import { getMatchesCollection } from "../../db-collections/matches";

export const Route = createFileRoute("/matches/")({
	component: MatchesIndexPage,
});

const initialValues: MatchFormValues = {
	name: "",
	scenario: "",
	status: "Scheduled",
};

function MatchesIndexPage() {
	const [isNewMatchOpen, setIsNewMatchOpen] = useState(false);
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
				action={
					<Button onPress={() => setIsNewMatchOpen(true)}>New match</Button>
				}
				description="Schedule scenarios and track each encounter through completion."
				eyebrow="Campaign encounters"
				title="Matches"
			/>

			{matches.length ? (
				<MatchesTable matches={matches} />
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
					onSubmit={async (values) => {
						const id = safeRandomUUID();
						const transaction = matchesCollection.insert({ id, ...values });
						await transaction.isPersisted.promise;
						setIsNewMatchOpen(false);
					}}
					submitLabel="Create match"
				/>
			</Dialog>
		</IndexPage>
	);
}
