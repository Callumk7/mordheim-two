import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Activity,
	Coins,
	HeartPulse,
	Pencil,
	Shield,
	Skull,
	Swords,
	Trophy,
	Users,
} from "lucide-react";
import { useState } from "react";
import {
	ArchiveAction,
	ArchivedBanner,
} from "@/components/shared/archive-controls";
import { CreateWarriorDialog } from "@/components/shared/create-warrior-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { EntityHeader, EntityToolbar } from "@/components/shared/entity-chrome";
import { SectionHeading } from "@/components/shared/section-heading";
import {
	CombatLeaderboard,
	HeroStat,
	StatTile,
} from "@/components/shared/stat-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { WarbandForm } from "@/components/warband-form";
import { WarriorForm } from "@/components/warrior-form";
import { getCollections } from "@/db-collections";
import {
	setWarbandArchivedTransaction,
	updateWarbandTransaction,
} from "@/db-collections/mutations/warbands";
import {
	createWarriorTransaction,
	updateWarriorTransaction,
} from "@/db-collections/mutations/warriors";
import {
	getCombatStatAdjustment,
	getWarbandCombatStats,
} from "@/db-collections/projections";
import { useWarbandDashboard } from "@/db-collections/queries";

export const Route = createFileRoute(
	"/campaigns/$campaignId/warbands/$warbandId/",
)({
	component: WarbandDetailPage,
});

function WarbandDetailPage() {
	const [isEditWarbandOpen, setIsEditWarbandOpen] = useState(false);
	const [isNewWarriorOpen, setIsNewWarriorOpen] = useState(false);
	const [editingWarriorId, setEditingWarriorId] = useState<string | null>(null);
	const { campaignId, warbandId } = Route.useParams();
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const { warbands: warbandsCollection } = collections;
	const { data: warbands } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbandsCollection })
				.where(({ warband }) => eq(warband.id, warbandId)),
	});
	const dashboard = useWarbandDashboard(dbClient, campaignId, warbandId);
	const warband = warbands[0];
	const allRoster = [...dashboard.livingRoster, ...dashboard.graveyard];
	const editingWarrior = allRoster.find(
		(warrior) => warrior.id === editingWarriorId,
	);

	if (!warband) return null;

	const warbandCombat = getWarbandCombatStats(dashboard.combatStats, warbandId);

	return (
		<div className="grid gap-10">
			<EntityToolbar
				actions={
					<ArchiveAction
						entityLabel="warband"
						isArchived={warband.isArchived}
						name={warband.name}
						onConfirm={async () => {
							const transaction = setWarbandArchivedTransaction(
								collections,
								warband.id,
								!warband.isArchived,
							);
							await transaction.isPersisted.promise;
						}}
					/>
				}
				backLabel="← Warbands"
				backLink={{
					params: { campaignId },
					to: "/campaigns/$campaignId/warbands",
				}}
				destructiveLabel="Delete warband"
				destructiveLink={{
					params: { campaignId, warbandId },
					to: "/campaigns/$campaignId/warbands/$warbandId/delete",
				}}
			/>

			{warband.isArchived && warband.archivedAt ? (
				<ArchivedBanner archivedAt={warband.archivedAt} />
			) : null}

			<Card className="relative gap-0 py-0">
				<EntityHeader
					actions={
						<div className="flex items-end gap-6">
							<div className="text-right">
								<p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
									Warband rating
								</p>
								<p className="mt-1 font-mordheim text-5xl tabular-nums text-primary">
									{warband.rating}
								</p>
							</div>
							<Button
								variant="outline"
								onPress={() => setIsEditWarbandOpen(true)}
							>
								<Pencil aria-hidden="true" data-icon="inline-start" />
								Edit
							</Button>
						</div>
					}
					className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
					description={warband.bio || undefined}
					descriptionClassName="mt-3 max-w-3xl whitespace-pre-line"
					eyebrow={warband.faction}
					title={warband.name}
					titleClassName="mt-3"
				/>
				<div className="grid border-t border-border bg-muted/20 sm:grid-cols-2 lg:grid-cols-5">
					<HeroStat icon={Coins} label="Gold crowns" value={warband.gold} />
					<HeroStat
						icon={Trophy}
						label="Wins"
						value={dashboard.matchStats.wins}
					/>
					<HeroStat
						icon={Swords}
						label="Matches played"
						value={dashboard.matchStats.played}
					/>
					<HeroStat
						icon={Users}
						label="Living warriors"
						value={dashboard.livingRoster.length}
					/>
					<HeroStat
						icon={Skull}
						label="Fallen warriors"
						value={dashboard.graveyard.length}
					/>
				</div>
			</Card>

			<section aria-labelledby="record-heading">
				<SectionHeading
					description="Results are calculated from completed matches involving this warband."
					eyebrow="Campaign performance"
					id="record-heading"
					title="Match record"
				/>
				<div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
					<StatTile label="Played" value={dashboard.matchStats.played} />
					<StatTile label="Wins" value={dashboard.matchStats.wins} />
					<StatTile label="Losses" value={dashboard.matchStats.losses} />
					<StatTile label="Draws" value={dashboard.matchStats.draws} />
					<StatTile
						label="Win rate"
						suffix="%"
						value={dashboard.matchStats.winRate}
					/>
				</div>
				{dashboard.matches.length === 0 ? (
					<EmptyState
						className="mt-4"
						description="Add this warband to a match to begin its campaign record."
						icon={
							<Shield
								aria-hidden="true"
								className="mx-auto size-6 text-muted-foreground"
							/>
						}
						title="No matches yet"
						titleAs="h3"
						variant="dashboard"
					/>
				) : null}
			</section>

			<section aria-labelledby="combat-heading">
				<SectionHeading
					description="A live summary of active event records and manual warrior corrections."
					eyebrow="Battle scars"
					id="combat-heading"
					title="Combat record"
				/>
				<div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
					<StatTile
						adjustment={getCombatStatAdjustment(
							warbandCombat,
							"knockdownsGiven",
						)}
						label="Knockdowns given"
						value={warbandCombat.knockdownsGiven}
					/>
					<StatTile
						adjustment={getCombatStatAdjustment(
							warbandCombat,
							"knockdownsTaken",
						)}
						label="Knockdowns taken"
						value={warbandCombat.knockdownsTaken}
					/>
					<StatTile
						adjustment={getCombatStatAdjustment(warbandCombat, "injuriesGiven")}
						label="Injuries given"
						value={warbandCombat.injuriesGiven}
					/>
					<StatTile
						adjustment={getCombatStatAdjustment(warbandCombat, "injuriesTaken")}
						label="Injuries taken"
						value={warbandCombat.injuriesTaken}
					/>
					<StatTile
						adjustment={getCombatStatAdjustment(warbandCombat, "deathsGiven")}
						label="Deaths given"
						value={warbandCombat.deathsGiven}
					/>
				</div>
			</section>

			<section aria-labelledby="roster-heading">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<SectionHeading
						description="The fighters currently able to carry the warband’s colors."
						eyebrow="Campaign roster"
						id="roster-heading"
						title="Living warriors"
					/>
					<Button
						isDisabled={warband.isArchived}
						onPress={() => setIsNewWarriorOpen(true)}
					>
						Add warrior
					</Button>
				</div>
				{dashboard.livingRoster.length ? (
					<ul className="mt-5 grid gap-4 md:grid-cols-2">
						{dashboard.livingRoster.map((warrior) => (
							<li key={warrior.id}>
								<Card className="h-full" size="sm">
									<CardContent className="flex items-center justify-between gap-5">
										<div className="min-w-0">
											<Link
												className="font-serif text-xl font-semibold text-foreground hover:text-primary"
												params={{ campaignId, warriorId: warrior.id }}
												to="/campaigns/$campaignId/warriors/$warriorId"
											>
												{warrior.name}
											</Link>
											<p className="mt-1 text-sm text-muted-foreground">
												{warrior.class}
											</p>
										</div>
										<Button
											size="sm"
											variant="outline"
											onPress={() => setEditingWarriorId(warrior.id)}
										>
											Edit
										</Button>
									</CardContent>
								</Card>
							</li>
						))}
					</ul>
				) : (
					<EmptyState
						action={
							<Button
								isDisabled={warband.isArchived}
								onPress={() => setIsNewWarriorOpen(true)}
							>
								Recruit a warrior
							</Button>
						}
						className="mt-5"
						description="Recruit a fighter to begin building this warband’s active roster."
						icon={
							<Shield
								aria-hidden="true"
								className="mx-auto size-6 text-muted-foreground"
							/>
						}
						title="No living warriors"
						titleAs="h3"
						variant="dashboard"
					/>
				)}
			</section>

			<CombatLeaderboard
				description="Ranked by deaths, then injuries, then knockdowns given. Fallen warriors remain in the standings."
				detailFor={(row) =>
					allRoster.find((warrior) => warrior.id === row.id)?.class
				}
				emptyMessage="Recruit a warrior to establish this warband’s standings."
				entityLabel="Warrior"
				rows={dashboard.warriorLeaderboard}
				title="Warrior leaderboard"
			/>

			<section aria-labelledby="graveyard-heading">
				<SectionHeading
					description="Warriors marked dead or lost to an active death event."
					eyebrow="In memoriam"
					id="graveyard-heading"
					title="Graveyard"
				/>
				{dashboard.graveyard.length ? (
					<ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{dashboard.graveyard.map((warrior) => (
							<li key={warrior.id}>
								<Card className="h-full bg-muted/20" size="sm">
									<CardContent>
										<Skull
											aria-hidden="true"
											className="size-5 text-muted-foreground"
										/>
										<Link
											className="mt-3 block font-serif text-xl font-semibold text-foreground hover:text-primary"
											params={{ campaignId, warriorId: warrior.id }}
											to="/campaigns/$campaignId/warriors/$warriorId"
										>
											{warrior.name}
										</Link>
										<p className="text-sm text-muted-foreground">
											{warrior.class}
										</p>
										<p className="mt-4 text-xs leading-5 text-muted-foreground">
											{warrior.killerName
												? `Slain by ${warrior.killerName}`
												: "Remembered among the fallen"}
											{warrior.matchName ? ` at ${warrior.matchName}` : ""}
											{warrior.deathAt
												? ` · ${formatDate(warrior.deathAt)}`
												: ""}
										</p>
									</CardContent>
								</Card>
							</li>
						))}
					</ul>
				) : (
					<EmptyState
						className="mt-5"
						description="No warriors from this warband have been recorded among the fallen."
						icon={
							<Shield
								aria-hidden="true"
								className="mx-auto size-6 text-muted-foreground"
							/>
						}
						title="The graveyard is empty"
						titleAs="h3"
						variant="dashboard"
					/>
				)}
			</section>

			<section aria-labelledby="events-heading">
				<SectionHeading
					description="Every recorded encounter involving this warband, newest first."
					eyebrow="Chronicle"
					id="events-heading"
					title="Warband event log"
				/>
				{dashboard.events.length ? (
					<Card className="mt-5">
						<CardContent>
							<ol className="divide-y divide-border">
								{dashboard.events.map((event) => (
									<li
										className="grid gap-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start"
										key={event.id}
									>
										<div className="flex size-9 items-center justify-center rounded-full border border-border bg-muted/50">
											{event.outcome === "Death" ? (
												<Skull aria-hidden="true" className="size-4" />
											) : event.outcome === "Injury" ? (
												<HeartPulse aria-hidden="true" className="size-4" />
											) : (
												<Activity aria-hidden="true" className="size-4" />
											)}
										</div>
										<div>
											<Link
												className="font-medium text-foreground hover:text-primary"
												params={{ campaignId, eventId: event.id }}
												to="/campaigns/$campaignId/events/$eventId"
											>
												{event.attackerWarriorName} struck{" "}
												{event.defenderWarriorName}
											</Link>
											<p className="mt-1 text-sm text-muted-foreground">
												{event.attackerName} vs. {event.defenderName} ·{" "}
												{event.matchName}
											</p>
											{event.notes ? (
												<p className="mt-2 text-sm text-muted-foreground">
													{event.notes}
												</p>
											) : null}
										</div>
										<div className="sm:text-right">
											<span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground">
												{event.voidedAt
													? "Voided"
													: (event.outcome ?? "Unresolved")}
											</span>
											<time
												className="mt-2 block text-xs text-muted-foreground"
												dateTime={event.createdAt}
											>
												{formatDate(event.createdAt)}
											</time>
										</div>
									</li>
								))}
							</ol>
						</CardContent>
					</Card>
				) : (
					<EmptyState
						className="mt-5"
						description="Events will appear here when this warband enters combat."
						icon={
							<Shield
								aria-hidden="true"
								className="mx-auto size-6 text-muted-foreground"
							/>
						}
						title="No events recorded"
						titleAs="h3"
						variant="dashboard"
					/>
				)}
			</section>

			<Dialog isOpen={isEditWarbandOpen} onOpenChange={setIsEditWarbandOpen}>
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

			<CreateWarriorDialog
				isOpen={isNewWarriorOpen}
				onOpenChange={setIsNewWarriorOpen}
				onSubmit={async (values) => {
					const transaction = createWarriorTransaction(collections, {
						...values,
						campaignId,
					});
					await transaction.isPersisted.promise;
				}}
				warband={warband}
			/>

			<Dialog
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

function formatDate(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
		date,
	);
}
