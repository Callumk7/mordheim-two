import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { getCollections } from "@/db-collections";
import {
	createWarbandTransaction,
	updateWarbandTransaction,
} from "@/db-collections/mutations/warbands";
import { useWarbands } from "@/db-collections/queries/warbands";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
} from "../../components/index-page";

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
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const warbands = useWarbands(dbClient);
	const updateWarband = async (id: string, changes: WarbandInlineUpdate) => {
		const transaction = updateWarbandTransaction(collections, id, changes);
		await transaction.isPersisted.promise;
	};

	return (
		<IndexPage>
			<IndexPageHeader
				action={
					<Button onPress={() => setIsNewWarbandOpen(true)}>New warband</Button>
				}
				description="Manage every company fighting through the City of the Damned."
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
						const transaction = createWarbandTransaction(collections, values);
						await transaction.isPersisted.promise;
						setIsNewWarbandOpen(false);
					}}
					submitLabel="Create warband"
				/>
			</Dialog>
		</IndexPage>
	);
}
