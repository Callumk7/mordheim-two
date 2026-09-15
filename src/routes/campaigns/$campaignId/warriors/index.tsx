import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { WarriorsTable } from "#/components/table/warriors-table";
import { WarriorForm, type WarriorFormValues } from "#/components/warrior-form";
import { EmptyState } from "@/components/shared/empty-state";
import { IndexPage, IndexPageHeader } from "@/components/shared/index-page";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Toggle } from "@/components/ui/toggle";
import { useWarriorMutations } from "@/db-collections/mutations/warriors";
import { useCombatStats, useWarriorsIndex } from "@/db-collections/queries";

export const Route = createFileRoute("/campaigns/$campaignId/warriors/")({
	component: WarriorsIndexPage,
});

function WarriorsIndexPage() {
	const [isNewWarriorOpen, setIsNewWarriorOpen] = useState(false);
	const [showArchived, setShowArchived] = useState(false);
	const { campaignId } = Route.useParams();
	const { dbClient } = Route.useRouteContext();
	const combatStats = useCombatStats(dbClient, campaignId);
	const { createWarrior } = useWarriorMutations(dbClient);
	const { warbands, warriors } = useWarriorsIndex(
		dbClient,
		campaignId,
		showArchived,
	);
	const activeWarbands = warbands.filter((warband) => !warband.isArchived);
	const warbandNames = new Map(
		warbands.map((warband) => [warband.id, warband.name]),
	);
	const archivedWarbandIds = new Set(
		warbands
			.filter((warband) => warband.isArchived)
			.map((warband) => warband.id),
	);
	const initialValues: WarriorFormValues = {
		name: "",
		class: "",
		status: "Alive",
		warbandId: activeWarbands[0]?.id ?? "",
		knocked: 0,
		injuries: 0,
		knockedDowns: 0,
	};

	return (
		<IndexPage>
			<IndexPageHeader
				action={
					<div className="flex flex-wrap items-center gap-4">
						<Toggle
							isSelected={showArchived}
							variant="outline"
							onChange={setShowArchived}
						>
							Show archived
						</Toggle>
						<Button onPress={() => setIsNewWarriorOpen(true)}>
							New warrior
						</Button>
					</div>
				}
				description="Manage every fighter serving in the campaign’s warbands."
				title="Warriors"
			/>

			{warriors.length ? (
				<WarriorsTable
					archivedWarbandIds={archivedWarbandIds}
					campaignId={campaignId}
					combatStats={combatStats}
					warbandNames={warbandNames}
					warriors={warriors}
				/>
			) : (
				<EmptyState
					action={
						<Button variant="link" onPress={() => setIsNewWarriorOpen(true)}>
							Create a warrior →
						</Button>
					}
					description="Add the first fighter to a campaign warband."
					title="No warriors yet"
				/>
			)}

			<Dialog isOpen={isNewWarriorOpen} onOpenChange={setIsNewWarriorOpen}>
				<DialogHeader>
					<DialogTitle>New warrior</DialogTitle>
					<DialogDescription>
						Add a new fighter to a campaign warband.
					</DialogDescription>
				</DialogHeader>
				{activeWarbands.length ? (
					<WarriorForm
						initialValues={initialValues}
						onSubmit={async (values) => {
							await createWarrior({ ...values, campaignId });
							setIsNewWarriorOpen(false);
						}}
						submitLabel="Create warrior"
						warbands={activeWarbands}
					/>
				) : (
					<EmptyState
						description="Create a warband before recruiting a warrior."
						title="A warband is required"
						variant="dialog"
					/>
				)}
			</Dialog>
		</IndexPage>
	);
}
