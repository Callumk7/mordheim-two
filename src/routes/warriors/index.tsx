import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { WarriorsTable } from "#/components/table/warriors-table";
import { WarriorForm, type WarriorFormValues } from "#/components/warrior-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { getCollections } from "@/db-collections";
import { createWarriorTransaction } from "@/db-collections/mutations/warriors";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
} from "../../components/index-page";

export const Route = createFileRoute("/warriors/")({
	component: WarriorsIndexPage,
});

function WarriorsIndexPage() {
	const [isNewWarriorOpen, setIsNewWarriorOpen] = useState(false);
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const { warbands: warbandsCollection, warriors: warriorsCollection } =
		collections;
	const { data: warriors } = useLiveQuery({
		query: (q) =>
			q
				.from({ warrior: warriorsCollection })
				.orderBy(({ warrior }) => warrior.name, "asc"),
	});
	const { data: warbands } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbandsCollection })
				.orderBy(({ warband }) => warband.name),
	});
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
				<WarriorsTable warbandNames={warbandNames} warriors={warriors} />
			) : (
				<IndexEmptyState
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
							const transaction = createWarriorTransaction(collections, values);
							await transaction.isPersisted.promise;
							setIsNewWarriorOpen(false);
						}}
						submitLabel="Create warrior"
						warbands={warbands}
					/>
				) : (
					<section className="rounded-xl border border-dashed border-input px-6 py-10 text-center">
						<h2 className="font-serif text-2xl text-foreground">
							A warband is required
						</h2>
						<p className="mt-2 text-muted-foreground">
							Create a warband before recruiting a warrior.
						</p>
					</section>
				)}
			</Dialog>
		</IndexPage>
	);
}
