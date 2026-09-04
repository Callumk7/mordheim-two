import { safeRandomUUID } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Plus, Users } from "lucide-react";
import { useState } from "react";
import { EventForm } from "@/components/event-form";
import { formatStatus, MatchForm } from "@/components/match-form";
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
import { getCollections } from "@/db-collections";
import { updateMatchTransaction } from "@/db-collections/actions";
import type { MatchParticipantWarband } from "@/db-collections/projections";
import { useMatchWorkspace } from "@/db-collections/queries";

export const Route = createFileRoute("/matches/$matchId/")({
	component: MatchDetailPage,
});

function MatchDetailPage() {
	const [isEditMatchOpen, setIsEditMatchOpen] = useState(false);
	const [isNewEventOpen, setIsNewEventOpen] = useState(false);
	const { matchId } = Route.useParams();
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const { events } = collections;
	const {
		allWarbands: warbandRows,
		canAddEvent,
		events: eventRows,
		lockedParticipantWarbandIds,
		match,
		participants: participantRows,
		staffedWarbands: staffedParticipantWarbands,
		warbands: participantWarbands,
		warriors: warriorRows,
	} = useMatchWorkspace(dbClient, matchId);

	if (!match) return null;

	const attackerWarbandId = staffedParticipantWarbands[0]?.id ?? "";
	const defenderWarbandId = staffedParticipantWarbands[1]?.id ?? "";

	return (
		<div className="grid gap-8">
			<div className="flex items-center justify-between gap-4">
				<Link
					className="text-sm text-muted-foreground hover:text-primary/80"
					to="/matches"
				>
					← Matches
				</Link>
				<Link
					className="text-sm text-destructive/80 hover:text-destructive"
					params={{ matchId }}
					to="/matches/$matchId/delete"
				>
					Delete match
				</Link>
			</div>

			<header className="flex flex-col justify-between gap-6 border-b border-border pb-7 md:flex-row md:items-end">
				<div>
					<div className="flex flex-wrap items-center gap-3">
						<p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
							{match.scenario}
						</p>
						<span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
							{formatStatus(match.status)}
						</span>
					</div>
					<h1 className="mt-2 font-serif text-4xl font-semibold text-foreground sm:text-5xl">
						{match.name}
					</h1>
					<p className="mt-2 text-muted-foreground">
						Review the participating warbands and record events as the match
						unfolds.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						isDisabled={!canAddEvent}
						onPress={() => setIsNewEventOpen(true)}
					>
						<Plus aria-hidden="true" data-icon="inline-start" />
						Add event
					</Button>
					<Button variant="outline" onPress={() => setIsEditMatchOpen(true)}>
						<Pencil aria-hidden="true" data-icon="inline-start" />
						Edit match
					</Button>
				</div>
			</header>

			<section aria-labelledby="participants-heading" className="grid gap-4">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
						Participants
					</p>
					<h2
						className="mt-1 font-serif text-3xl text-foreground"
						id="participants-heading"
					>
						Warbands and rosters
					</h2>
				</div>

				{participantWarbands.length ? (
					<div className="grid items-start gap-5 lg:grid-cols-2">
						{participantWarbands.map((warband) => (
							<ParticipantCard key={warband.id} warband={warband} />
						))}
					</div>
				) : (
					<section className="rounded-xl border border-dashed border-input px-6 py-12 text-center">
						<h3 className="font-serif text-2xl text-foreground">
							No participating warbands
						</h3>
						<p className="mt-2 text-muted-foreground">
							Edit the match to choose the warbands taking part.
						</p>
						<Button
							className="mt-5"
							onPress={() => setIsEditMatchOpen(true)}
							variant="outline"
						>
							Edit participants
						</Button>
					</section>
				)}
			</section>

			<section aria-labelledby="events-heading" className="grid gap-4">
				<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
							Activity
						</p>
						<h2
							className="mt-1 font-serif text-3xl text-foreground"
							id="events-heading"
						>
							Match events
						</h2>
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
				<MatchEventsTable events={eventRows} />
			</section>

			<Dialog
				className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"
				isOpen={isNewEventOpen}
				onOpenChange={setIsNewEventOpen}
			>
				<DialogHeader>
					<DialogTitle>Add event</DialogTitle>
					<DialogDescription>
						Record an event for {match.name}.
					</DialogDescription>
				</DialogHeader>
				<EventForm
					initialValues={{
						matchId,
						attackerWarbandId,
						attackerWarriorId:
							warriorRows.find(
								(warrior) => warrior.warbandId === attackerWarbandId,
							)?.id ?? "",
						defenderWarbandId,
						defenderWarriorId:
							warriorRows.find(
								(warrior) => warrior.warbandId === defenderWarbandId,
							)?.id ?? "",
						notes: null,
					}}
					isMatchLocked
					key={`${matchId}:${String(isNewEventOpen)}`}
					matches={[match]}
					onSubmit={async (values) => {
						const transaction = events.insert({
							id: safeRandomUUID(),
							...values,
						});
						await transaction.isPersisted.promise;
						setIsNewEventOpen(false);
					}}
					participants={participantRows}
					submitLabel="Add event"
					warbands={participantWarbands}
					warriors={warriorRows}
				/>
			</Dialog>

			<Dialog
				className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"
				isOpen={isEditMatchOpen}
				onOpenChange={setIsEditMatchOpen}
			>
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
					onSubmit={async ({ participantWarbandIds, ...changes }) => {
						const selectedIds = new Set(participantWarbandIds);
						const existingIds = new Set(
							participantRows.map((participant) => participant.warbandId),
						);
						const now = new Date().toISOString();
						const additions = participantWarbandIds
							.filter((warbandId) => !existingIds.has(warbandId))
							.map((warbandId) => ({
								id: safeRandomUUID(),
								matchId,
								warbandId,
								createdAt: now,
								updatedAt: now,
							}));
						const removals = participantRows.filter(
							(participant) => !selectedIds.has(participant.warbandId),
						);
						const transaction = updateMatchTransaction(dbClient, collections, {
							id: matchId,
							changes,
							additions,
							removals,
						});
						await transaction.isPersisted.promise;
						setIsEditMatchOpen(false);
					}}
					submitLabel="Save changes"
					warbands={warbandRows}
				/>
			</Dialog>
		</div>
	);
}

function ParticipantCard({ warband }: { warband: MatchParticipantWarband }) {
	const { warriors } = warband;

	return (
		<Card>
			<CardHeader className="border-b border-border">
				<CardTitle className="font-serif text-2xl text-foreground">
					{warband.name}
				</CardTitle>
				<CardDescription>
					{warband.faction} · Captain {warband.captain}
				</CardDescription>
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
					<WarbandStat label="Rating" value={warband.rating} />
					<WarbandStat label="Wins" value={warband.wins} />
					<WarbandStat label="Status" value={warband.status} />
				</dl>

				<div>
					<div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
						<Users aria-hidden="true" className="size-4 text-primary" />
						{warriors.length} {warriors.length === 1 ? "warrior" : "warriors"}
					</div>
					{warriors.length ? (
						<div className="grid gap-2">
							{warriors.map((warrior) => (
								<div
									className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-lg border border-border bg-background px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
									key={warrior.id}
								>
									<div className="min-w-0">
										<Link
											className="truncate font-medium text-foreground hover:text-primary"
											params={{ warriorId: warrior.id }}
											to="/warriors/$warriorId"
										>
											{warrior.name}
										</Link>
										<p className="truncate text-xs text-muted-foreground">
											{warrior.class} · {warrior.status}
										</p>
										<p className="text-xs text-muted-foreground sm:hidden">
											{warrior.injuries} injuries · {warrior.knockedDowns} knock
											downs
										</p>
									</div>
									<span className="hidden text-xs text-muted-foreground sm:block">
										{warrior.injuries} injuries
									</span>
									<span className="hidden text-xs text-muted-foreground sm:block">
										{warrior.knockedDowns} knock downs
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
							))}
						</div>
					) : (
						<p className="rounded-lg border border-dashed border-input px-4 py-6 text-center text-sm text-muted-foreground">
							No warriors have joined this warband yet.
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function WarbandStat({
	label,
	value,
}: {
	label: string;
	value: number | string;
}) {
	return (
		<div className="rounded-lg bg-muted/30 px-3 py-2">
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd className="mt-0.5 truncate font-medium text-foreground">{value}</dd>
		</div>
	);
}
