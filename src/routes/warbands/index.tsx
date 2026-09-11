import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreateWarriorDialog } from "@/components/shared/create-warrior-dialog";
import { WarbandsTable } from "@/components/table/warbands-table";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { WarbandForm, type WarbandFormValues } from "@/components/warband-form";
import type { Warband } from "@/db/validation/warband";
import { getCollections } from "@/db-collections";
import {
	createWarbandTransaction,
	updateWarbandTransaction,
} from "@/db-collections/mutations/warbands";
import { createWarriorTransaction } from "@/db-collections/mutations/warriors";
import { useCombatStats } from "@/db-collections/queries";
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
	bio: "",
	gold: 500,
	rating: 100,
	wins: 0,
};

function WarbandsIndexPage() {
	const [isNewWarbandOpen, setIsNewWarbandOpen] = useState(false);
	const [recruitingWarband, setRecruitingWarband] = useState<Warband | null>(
		null,
	);
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const combatStats = useCombatStats(dbClient);
	const warbands = useWarbands(dbClient);

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
				<WarbandsTable
					combatStats={combatStats}
					onAddWarrior={setRecruitingWarband}
					onUpdateGold={async (warbandId, gold) => {
						const transaction = updateWarbandTransaction(
							collections,
							warbandId,
							{ gold },
						);
						await transaction.isPersisted.promise;
					}}
					warbands={warbands}
				/>
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

			{recruitingWarband ? (
				<CreateWarriorDialog
					isOpen
					onOpenChange={(isOpen) => {
						if (!isOpen) setRecruitingWarband(null);
					}}
					onSubmit={async (values) => {
						const transaction = createWarriorTransaction(collections, values);
						await transaction.isPersisted.promise;
					}}
					warband={recruitingWarband}
				/>
			) : null}

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
