import { safeRandomUUID, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import {
	type WarbandInlineUpdate,
	WarbandsTable,
} from "#/components/table/warbands-table";
import { WarbandForm, type WarbandFormValues } from "#/components/warband-form";
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
import { getWarbandsCollection } from "../../db-collections/warbands";

export const Route = createFileRoute("/warbands/")({
	component: WarbandsIndexPage,
});

const initialValues: WarbandFormValues = {
	name: "",
	faction: "Mercenaries",
	captain: "",
	rating: 100,
	wins: 0,
	status: "Recruiting",
};

function WarbandsIndexPage() {
	const [isNewWarbandOpen, setIsNewWarbandOpen] = useState(false);
	const { queryClient } = Route.useRouteContext();
	const warbandsCollection = getWarbandsCollection(queryClient);
	const { data: warbands } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbandsCollection })
				.orderBy(({ warband }) => warband.name, "asc"),
	});
	const updateWarband = useCallback(
		async (id: string, changes: WarbandInlineUpdate) => {
			const transaction = warbandsCollection.update(id, (draft) => {
				Object.assign(draft, changes);
			});
			await transaction.isPersisted.promise;
		},
		[warbandsCollection],
	);

	return (
		<IndexPage>
			<IndexPageHeader
				action={
					<Button onPress={() => setIsNewWarbandOpen(true)}>New warband</Button>
				}
				description="Manage every company fighting through the City of the Damned."
				eyebrow="Campaign records"
				title="Warbands"
			/>

			{warbands.length ? (
				<WarbandsTable onUpdate={updateWarband} warbands={warbands} />
			) : (
				<IndexEmptyState
					action={
						<Button variant="link" onPress={() => setIsNewWarbandOpen(true)}>
							Create a warband →
						</Button>
					}
					description="Create the first company in this campaign."
					title="No warbands yet"
				/>
			)}

			<Dialog
				className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"
				isOpen={isNewWarbandOpen}
				onOpenChange={setIsNewWarbandOpen}
			>
				<DialogHeader>
					<DialogTitle>New warband</DialogTitle>
					<DialogDescription>
						Record a new company for the campaign.
					</DialogDescription>
				</DialogHeader>
				<WarbandForm
					initialValues={initialValues}
					onSubmit={async (values) => {
						const id = safeRandomUUID();
						const transaction = warbandsCollection.insert({ id, ...values });
						await transaction.isPersisted.promise;
						setIsNewWarbandOpen(false);
					}}
					submitLabel="Create warband"
				/>
			</Dialog>
		</IndexPage>
	);
}
