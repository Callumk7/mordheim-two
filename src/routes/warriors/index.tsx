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
import { useWarriorMutations } from "@/db-collections/mutations/warriors";
import { useCombatStats, useWarriorsIndex } from "@/db-collections/queries";

export const Route = createFileRoute("/warriors/")({
	component: WarriorsIndexPage,
});

function WarriorsIndexPage() {
	const [isNewWarriorOpen, setIsNewWarriorOpen] = useState(false);
	const { dbClient } = Route.useRouteContext();
	const combatStats = useCombatStats(dbClient);
	const { createWarrior } = useWarriorMutations(dbClient);
	const { warbands, warriors } = useWarriorsIndex(dbClient);
	const warbandNames = new Map(
		warbands.map((warband) => [warband.id, warband.name]),
	);
	const initialValues: WarriorFormValues = {
		name: "",
		class: "",
		status: "Alive",
		warbandId: warbands[0]?.id ?? "",
		knocked: 0,
		injuries: 0,
		knockedDowns: 0,
	};

	return (
		<IndexPage>
			<IndexPageHeader
				action={
					<Button onPress={() => setIsNewWarriorOpen(true)}>New warrior</Button>
				}
				description="Manage every fighter serving in the campaign’s warbands."
				title="Warriors"
			/>

			{warriors.length ? (
				<WarriorsTable
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

			<Dialog
				className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"
				isOpen={isNewWarriorOpen}
				onOpenChange={setIsNewWarriorOpen}
			>
				<DialogHeader>
					<DialogTitle>New warrior</DialogTitle>
					<DialogDescription>
						Add a new fighter to a campaign warband.
					</DialogDescription>
				</DialogHeader>
				{warbands.length ? (
					<WarriorForm
						initialValues={initialValues}
						onSubmit={async (values) => {
							await createWarrior(values);
							setIsNewWarriorOpen(false);
						}}
						submitLabel="Create warrior"
						warbands={warbands}
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
