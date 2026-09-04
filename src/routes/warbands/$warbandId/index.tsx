import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { WarbandForm } from "@/components/warband-form";
import { WarriorForm, type WarriorFormValues } from "@/components/warrior-form";
import { getCollections } from "@/db-collections";
import { updateWarbandTransaction } from "@/db-collections/mutations/warbands";
import {
	createWarriorTransaction,
	updateWarriorTransaction,
} from "@/db-collections/mutations/warriors";

export const Route = createFileRoute("/warbands/$warbandId/")({
	component: WarbandDetailPage,
});

function WarbandDetailPage() {
	const [isEditWarbandOpen, setIsEditWarbandOpen] = useState(false);
	const [isNewWarriorOpen, setIsNewWarriorOpen] = useState(false);
	const [editingWarriorId, setEditingWarriorId] = useState<string | null>(null);
	const { warbandId } = Route.useParams();
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const { warbands: warbandsCollection, warriors: warriorsCollection } =
		collections;
	const { data: warbands } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbandsCollection })
				.where(({ warband }) => eq(warband.id, warbandId)),
	});
	const { data: warriors } = useLiveQuery({
		query: (q) =>
			q
				.from({ warrior: warriorsCollection })
				.where(({ warrior }) => eq(warrior.warbandId, warbandId))
				.orderBy(({ warrior }) => warrior.name, "asc"),
	});
	const warband = warbands[0];
	const editingWarrior = warriors.find(
		(warrior) => warrior.id === editingWarriorId,
	);
	const newWarriorValues: WarriorFormValues = {
		name: "",
		class: "",
		status: "Alive",
		warbandId,
		knocked: 0,
		injuries: 0,
		knockedDowns: 0,
	};

	if (!warband) return null;

	return (
		<div className="mx-auto max-w-4xl">
			<div className="flex items-center justify-between gap-4">
				<Link
					className="text-sm text-muted-foreground hover:text-primary/80"
					to="/warbands"
				>
					← Warbands
				</Link>
				<Link
					className="text-sm text-destructive/80 hover:text-destructive"
					params={{ warbandId }}
					to="/warbands/$warbandId/delete"
				>
					Delete warband
				</Link>
			</div>

			<header className="mt-7 border-b border-border pb-6">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
					{warband.faction}
				</p>
				<div className="mt-2 flex flex-wrap items-center justify-between gap-4">
					<h1 className="font-serif text-4xl font-semibold text-foreground">
						{warband.name}
					</h1>
					<Button variant="outline" onPress={() => setIsEditWarbandOpen(true)}>
						Edit warband
					</Button>
				</div>
				<p className="mt-2 text-muted-foreground">
					Campaign record and roster.
				</p>
			</header>

			<Card className="mt-7">
				<CardContent>
					<dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
						<Detail label="Captain" value={warband.captain} />
						<Detail label="Status" value={warband.status} />
						<Detail label="Rating" value={warband.rating} />
						<Detail label="Wins" value={warband.wins} />
					</dl>
				</CardContent>
			</Card>

			<section className="mt-10" aria-labelledby="roster-heading">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
							Campaign roster
						</p>
						<h2
							className="mt-2 font-serif text-3xl font-semibold text-foreground"
							id="roster-heading"
						>
							Warriors
						</h2>
					</div>
					<Button onPress={() => setIsNewWarriorOpen(true)}>Add warrior</Button>
				</div>

				{warriors.length ? (
					<ul className="mt-5 divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
						{warriors.map((warrior) => (
							<li
								className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between"
								key={warrior.id}
							>
								<div>
									<Link
										className="font-serif text-xl font-semibold text-foreground hover:text-primary"
										params={{ warriorId: warrior.id }}
										to="/warriors/$warriorId"
									>
										{warrior.name}
									</Link>
									<p className="mt-1 text-sm text-muted-foreground">
										{warrior.class} · {warrior.status}
									</p>
								</div>
								<div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
									<span>
										<span className="text-muted-foreground">Injuries </span>
										<span className="font-mono text-primary">
											{warrior.injuries}
										</span>
									</span>
									<span>
										<span className="text-muted-foreground">Knock downs </span>
										<span className="font-mono text-primary">
											{warrior.knockedDowns}
										</span>
									</span>
									<Link
										className="text-muted-foreground hover:text-foreground"
										params={{ warriorId: warrior.id }}
										to="/warriors/$warriorId"
									>
										View
									</Link>
									<Button
										size="sm"
										variant="outline"
										onPress={() => setEditingWarriorId(warrior.id)}
									>
										Edit
									</Button>
								</div>
							</li>
						))}
					</ul>
				) : (
					<Card className="mt-5 border border-dashed border-border">
						<CardContent className="py-10 text-center">
							<h3 className="font-serif text-2xl text-foreground">
								No warriors recruited
							</h3>
							<p className="mx-auto mt-2 max-w-md text-muted-foreground">
								This warband has no fighters yet. Recruit the first warrior to
								begin building its roster.
							</p>
							<Button
								className="mt-6"
								onPress={() => setIsNewWarriorOpen(true)}
							>
								Recruit the first warrior
							</Button>
						</CardContent>
					</Card>
				)}
			</section>

			<Dialog
				className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"
				isOpen={isEditWarbandOpen}
				onOpenChange={setIsEditWarbandOpen}
			>
				<DialogHeader>
					<DialogTitle>Edit warband</DialogTitle>
					<DialogDescription>
						Update this warband’s campaign record.
					</DialogDescription>
				</DialogHeader>
				<WarbandForm
					initialValues={warband}
					key={warband.id}
					onSubmit={async (values) => {
						const transaction = updateWarbandTransaction(
							collections,
							warband.id,
							values,
						);
						await transaction.isPersisted.promise;
						setIsEditWarbandOpen(false);
					}}
					submitLabel="Save changes"
				/>
			</Dialog>

			<Dialog
				className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"
				isOpen={isNewWarriorOpen}
				onOpenChange={setIsNewWarriorOpen}
			>
				<DialogHeader>
					<DialogTitle>Add warrior</DialogTitle>
					<DialogDescription>
						Recruit a fighter for {warband.name}.
					</DialogDescription>
				</DialogHeader>
				<WarriorForm
					initialValues={newWarriorValues}
					isWarbandLocked
					key={isNewWarriorOpen ? `new-${warbandId}` : "new-closed"}
					onSubmit={async (values) => {
						const transaction = createWarriorTransaction(collections, values);
						await transaction.isPersisted.promise;
						setIsNewWarriorOpen(false);
					}}
					submitLabel="Recruit warrior"
					warbandLockDescription="This warrior will serve this warband."
					warbands={[warband]}
				/>
			</Dialog>

			<Dialog
				className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"
				isOpen={editingWarrior !== undefined}
				onOpenChange={(isOpen) => {
					if (!isOpen) setEditingWarriorId(null);
				}}
			>
				<DialogHeader>
					<DialogTitle>Edit warrior</DialogTitle>
					<DialogDescription>
						Update this fighter’s campaign record.
					</DialogDescription>
				</DialogHeader>
				{editingWarrior ? (
					<WarriorForm
						initialValues={editingWarrior}
						isWarbandLocked
						key={editingWarrior.id}
						onSubmit={async (values) => {
							const transaction = updateWarriorTransaction(
								collections,
								editingWarrior.id,
								values,
							);
							await transaction.isPersisted.promise;
							setEditingWarriorId(null);
						}}
						submitLabel="Save changes"
						warbandLockDescription="This warrior belongs to this warband."
						warbands={[warband]}
					/>
				) : null}
			</Dialog>
		</div>
	);
}

function Detail({ label, value }: { label: string; value: string | number }) {
	return (
		<div>
			<dt className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
				{label}
			</dt>
			<dd className="mt-2 text-lg font-medium text-foreground">{value}</dd>
		</div>
	);
}
