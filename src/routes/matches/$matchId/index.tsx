import { safeRandomUUID } from "@tanstack/react-db";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Pencil, Plus, Trophy, Users } from "lucide-react";
import { useState } from "react";
import { Badge } from "#/components/ui/badge";
import { EventForm } from "@/components/event-form";
import { formatStatus, MatchForm } from "@/components/match-form";
import { MatchImage } from "@/components/match-image";
import { EmptyState } from "@/components/shared/empty-state";
import { EntityHeader, EntityToolbar } from "@/components/shared/entity-chrome";
import { MatchCompletionDialog } from "@/components/shared/match-completion-dialog";
import { MatchStatusActions } from "@/components/shared/match-status-actions";
import { StatTile } from "@/components/shared/stat-display";
import { Typography } from "@/components/shared/typography";
import {
	isActiveImageJobStatus,
	useImageGenerationPolling,
} from "@/components/shared/use-image-generation-polling";
import { MatchEventsTable } from "@/components/table/match-events-table";
import { Button, LinkButton } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { Warrior } from "@/db/validation/warrior";
import { getCollections } from "@/db-collections";
import {
	createEventTransaction,
	setEventOutcomeTransaction,
} from "@/db-collections/mutations/events";
import { updateMatchTransaction } from "@/db-collections/mutations/matches";
import {
	type CombatStatsProjection,
	getWarbandCombatStats,
	getWarriorCombatStats,
	type MatchParticipantWarband,
	projectCombatStats,
} from "@/db-collections/projections";
import { useCombatStats, useMatchWorkspace } from "@/db-collections/queries";
import { buildUpdateMatchCommand } from "@/lib/match-commands";
import { getMatchImagery } from "@/server/match-images";

export const Route = createFileRoute("/matches/$matchId/")({
	loader: ({ params }) =>
		getMatchImagery({ data: { matchId: params.matchId } }),
	component: MatchDetailPage,
});

function MatchDetailPage() {
	const [isCompletionOpen, setIsCompletionOpen] = useState(false);
	const [isEditMatchOpen, setIsEditMatchOpen] = useState(false);
	const [isNewEventOpen, setIsNewEventOpen] = useState(false);
	const { matchId } = Route.useParams();
	const imagery = Route.useLoaderData();
	const router = useRouter();
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const {
		allWarbands: warbandRows,
		canAddEvent,
		eligibleWarbands,
		eligibleWarriors,
		events: eventRows,
		lockedParticipantWarbandIds,
		match,
		participants: participantRows,
		staffedWarbands: staffedParticipantWarbands,
		warbands: participantWarbands,
		winnerWarband,
	} = useMatchWorkspace(dbClient, matchId);
	// Projected over every event, so a warrior killed in an earlier match is
	// still recognised as dead here.
	const campaignCombatStats = useCombatStats(dbClient);
	const hasActiveImageJob =
		"error" in imagery
			? false
			: [imagery.match, ...Object.values(imagery.events)].some(
					(job) => job !== null && isActiveImageJobStatus(job.status),
				);
	useImageGenerationPolling(hasActiveImageJob);

	if (!match) return null;

	const deadWarriorIds = new Set(
		[...campaignCombatStats.warriors]
			.filter(([, stats]) => stats.isDead)
			.map(([warriorId]) => warriorId),
	);

	const matchCombatStats = projectCombatStats(eventRows);
	const attackerWarbandId = staffedParticipantWarbands[0]?.id ?? "";
	const defenderWarbandId = staffedParticipantWarbands[1]?.id ?? "";
	const initialEventValues = {
		matchId,
		attackerWarbandId,
		attackerWarriorId:
			eligibleWarriors.find(
				(warrior) => warrior.warbandId === attackerWarbandId,
			)?.id ?? "",
		defenderWarbandId,
		defenderWarriorId:
			eligibleWarriors.find(
				(warrior) => warrior.warbandId === defenderWarbandId,
			)?.id ?? "",
		notes: null,
	};
	const addEvent = async (
		values: Parameters<typeof createEventTransaction>[1],
	) => {
		const transaction = createEventTransaction(collections, values);
		await transaction.isPersisted.promise;
	};
	const setEventOutcome = async (
		eventId: string,
		outcome: Parameters<typeof setEventOutcomeTransaction>[2],
	) => {
		const transaction = setEventOutcomeTransaction(
			collections,
			eventId,
			outcome,
		);
		await transaction.isPersisted.promise;
		// Resolution submits an event illustration server-side; reload its status.
		await router.invalidate();
	};
	const updateMatch = async (
		changes: Parameters<typeof updateMatchTransaction>[2]["changes"],
	) => {
		const transaction = updateMatchTransaction(dbClient, collections, {
			id: matchId,
			changes,
			additions: [],
			removals: [],
		});
		await transaction.isPersisted.promise;
		// Completing a match submits its illustration server-side; reload the status.
		await router.invalidate();
	};

	return (
		<div className="grid gap-8">
			<EntityToolbar
				backLabel="← Matches"
				backLink={{ to: "/matches" }}
				destructiveLabel="Delete match"
				destructiveLink={{
					params: { matchId },
					to: "/matches/$matchId/delete",
				}}
			/>

			<EntityHeader
				actions={
					<div className="flex flex-wrap gap-2">
						<MatchStatusActions
							onOpenCompletion={() => setIsCompletionOpen(true)}
							onStatusChange={(status) => updateMatch({ status })}
							status={match.status}
						/>
						<Button
							isDisabled={!canAddEvent}
							onPress={() => setIsNewEventOpen(true)}
							variant="outline"
						>
							<Plus aria-hidden="true" data-icon="inline-start" />
							Add event
						</Button>
						<Button variant="outline" onPress={() => setIsEditMatchOpen(true)}>
							<Pencil aria-hidden="true" data-icon="inline-start" />
							Edit match
						</Button>
					</div>
				}
				className="flex flex-col justify-between gap-6 border-b border-border pb-7 md:flex-row md:items-end"
				description="Review the participating warbands and record events as the match unfolds."
				leading={
					<div className="flex flex-wrap items-center gap-3">
						<Badge variant="outline">{formatStatus(match.status)}</Badge>
						<Badge variant="outline">
							{match.result === "Victory"
								? `${winnerWarband?.name ?? "Unknown warband"} won`
								: match.result}
						</Badge>
					</div>
				}
				title={match.name}
				titleClassName="mt-5"
			/>

			<section aria-labelledby="events-heading" className="grid gap-4">
				<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
					<div>
						<Typography
							variant="sectionTitle"
							className="mt-1 text-foreground"
							id="events-heading"
						>
							Match events
						</Typography>
						{canAddEvent ? (
							<p className="mt-1 text-sm text-muted-foreground">
								Newest events appear first.
							</p>
						) : (
							<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
								Add warriors to at least two participating warbands before
								recording an event.
							</p>
						)}
					</div>
					<Button
						isDisabled={!canAddEvent}
						onPress={() => setIsNewEventOpen(true)}
						variant="outline"
					>
						<Plus aria-hidden="true" data-icon="inline-start" />
						Add event
					</Button>
				</div>
				<MatchEventsTable
					deadWarriorIds={deadWarriorIds}
					events={eventRows}
					imageJobs={imagery.events}
					onSetOutcome={setEventOutcome}
				/>
			</section>

			<section aria-labelledby="participants-heading" className="grid gap-4">
				<div>
					<Typography
						variant="sectionTitle"
						className="mt-1 text-foreground"
						id="participants-heading"
					>
						Warbands and rosters
					</Typography>
				</div>

				{participantWarbands.length ? (
					<div className="grid items-start gap-5 lg:grid-cols-2">
						{participantWarbands.map((warband) => (
							<ParticipantCard
								combatStats={matchCombatStats}
								isWinner={warband.id === match.winnerWarbandId}
								key={warband.id}
								warband={warband}
							/>
						))}
					</div>
				) : (
					<EmptyState
						action={
							<Button
								onPress={() => setIsEditMatchOpen(true)}
								variant="outline"
							>
								Edit participants
							</Button>
						}
						description="Edit the match to choose the warbands taking part."
						title="No participating warbands"
						titleAs="h3"
						variant="participant"
					/>
				)}
			</section>

			<MatchImage
				imagery={imagery}
				match={match}
				winnerName={winnerWarband?.name ?? "The winning warband"}
			/>

			<MatchCompletionDialog
				canAddEvent={staffedParticipantWarbands.length >= 2}
				deadWarriorIds={deadWarriorIds}
				events={eventRows}
				eventImageJobs={imagery.events}
				initialEventValues={initialEventValues}
				isOpen={isCompletionOpen}
				match={match}
				onAddEvent={addEvent}
				onOpenChange={setIsCompletionOpen}
				onSaveResult={(changes) => updateMatch(changes)}
				onSetOutcome={setEventOutcome}
				participants={participantRows}
				warbands={eligibleWarbands}
				warriors={eligibleWarriors}
			/>

			<Dialog isOpen={isNewEventOpen} onOpenChange={setIsNewEventOpen}>
				<DialogHeader>
					<DialogTitle>Add event</DialogTitle>
					<DialogDescription>
						Record an event for {match.name}.
					</DialogDescription>
				</DialogHeader>
				<EventForm
					initialValues={initialEventValues}
					isMatchLocked
					key={`${matchId}:${String(isNewEventOpen)}`}
					matches={[match]}
					onSubmit={async (values) => {
						await addEvent(values);
						setIsNewEventOpen(false);
					}}
					participants={participantRows}
					submitLabel="Add event"
					warbands={eligibleWarbands}
					warriors={eligibleWarriors}
				/>
			</Dialog>

			<Dialog isOpen={isEditMatchOpen} onOpenChange={setIsEditMatchOpen}>
				<DialogHeader>
					<DialogTitle>Edit match</DialogTitle>
					<DialogDescription>
						Update match details and participating warbands.
					</DialogDescription>
				</DialogHeader>
				<MatchForm
					initialValues={{
						...match,
						participantWarbandIds: participantRows.map(
							(participant) => participant.warbandId,
						),
					}}
					key={`${match.id}:${String(isEditMatchOpen)}`}
					lockedParticipantWarbandIds={lockedParticipantWarbandIds}
					onSubmit={async (values) => {
						const command = buildUpdateMatchCommand(
							matchId,
							values,
							participantRows,
							{
								newId: safeRandomUUID,
								now: () => new Date().toISOString(),
							},
						);
						const transaction = updateMatchTransaction(
							dbClient,
							collections,
							command,
						);
						await transaction.isPersisted.promise;
						await router.invalidate();
						setIsEditMatchOpen(false);
					}}
					submitLabel="Save changes"
					warbands={warbandRows.filter((warband) => !warband.isArchived)}
				/>
			</Dialog>
		</div>
	);
}

function ParticipantCard({
	combatStats,
	isWinner,
	warband,
}: {
	combatStats: CombatStatsProjection;
	isWinner: boolean;
	warband: MatchParticipantWarband;
}) {
	const { warriors } = warband;
	const stats = getWarbandCombatStats(combatStats, warband.id);

	return (
		<Card>
			<CardHeader className="border-b border-border">
				<CardTitle className="flex items-center gap-2">
					{warband.name}
					{isWinner ? (
						<Trophy aria-label="Match winner" className="size-4 text-primary" />
					) : null}
				</CardTitle>
				<CardDescription>{warband.faction}</CardDescription>
				<CardAction>
					<LinkButton
						aria-label={`View warband ${warband.name}`}
						params={{ warbandId: warband.id }}
						size="sm"
						to="/warbands/$warbandId"
						variant="outline"
					>
						View
					</LinkButton>
				</CardAction>
			</CardHeader>
			<CardContent className="grid gap-5">
				<dl className="grid grid-cols-3 gap-3">
					<StatTile
						label="KDs given"
						value={stats.knockdownsGiven}
						variant="compact"
					/>
					<StatTile
						label="Injuries given"
						value={stats.injuriesGiven}
						variant="compact"
					/>
					<StatTile
						label="Deaths given"
						value={stats.deathsGiven}
						variant="compact"
					/>
				</dl>

				<div>
					<div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
						<Users aria-hidden="true" className="size-4 text-primary" />
						{warriors.length} {warriors.length === 1 ? "warrior" : "warriors"}
					</div>
					{warriors.length ? (
						<div className="grid gap-2">
							{warriors.map((warrior) => (
								<ParticipantWarrior
									combatStats={combatStats}
									key={warrior.id}
									warrior={warrior}
								/>
							))}
						</div>
					) : (
						<EmptyState
							description="No warriors have joined this warband yet."
							variant="compact"
						/>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function ParticipantWarrior({
	combatStats,
	warrior,
}: {
	combatStats: CombatStatsProjection;
	warrior: Warrior;
}) {
	const stats = getWarriorCombatStats(combatStats, warrior.id);
	return (
		<div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-lg border border-border bg-background px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
			<div className="min-w-0">
				<Link
					className="truncate font-medium text-foreground hover:text-primary"
					params={{ warriorId: warrior.id }}
					to="/warriors/$warriorId"
				>
					{warrior.name}
				</Link>
				<p className="truncate text-xs text-muted-foreground">
					{warrior.class} · {stats.isDead ? "Dead" : "Alive"}
				</p>
				<p className="text-xs text-muted-foreground sm:hidden">
					{stats.injuriesTaken} injuries · {stats.knockdownsTaken} knockdowns
				</p>
			</div>
			<span className="hidden text-xs text-muted-foreground sm:block">
				{stats.injuriesTaken} injuries
			</span>
			<span className="hidden text-xs text-muted-foreground sm:block">
				{stats.knockdownsTaken} knockdowns
			</span>
			<LinkButton
				aria-label={`View warrior ${warrior.name}`}
				params={{ warriorId: warrior.id }}
				size="xs"
				to="/warriors/$warriorId"
				variant="ghost"
			>
				View
			</LinkButton>
		</div>
	);
}
