import { Plus } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { EventForm, type EventFormValues } from "@/components/event-form";
import { MatchEventsTable } from "@/components/table/match-events-table";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { EventOutcome } from "@/db/validation/event";
import { MATCH_RESULTS, type Match } from "@/db/validation/match";
import type { Warband } from "@/db/validation/warband";
import type { WarbandMatch } from "@/db/validation/warband-match";
import type { Warrior } from "@/db/validation/warrior";
import type { MatchEventRow } from "@/db-collections/projections";
import { isMatchResultConsistent } from "@/lib/match-form";

const COMPLETION_RESULTS = MATCH_RESULTS.filter(
	(result) => result !== "Pending",
);

export function MatchCompletionDialog({
	canAddEvent,
	events,
	initialEventValues,
	isOpen,
	match,
	onAddEvent,
	onOpenChange,
	onSaveResult,
	onSetOutcome,
	participants,
	warbands,
	warriors,
}: {
	canAddEvent: boolean;
	events: readonly MatchEventRow[];
	initialEventValues: EventFormValues;
	isOpen: boolean;
	match: Match;
	onAddEvent: (values: EventFormValues) => Promise<void>;
	onOpenChange: (isOpen: boolean) => void;
	onSaveResult: (changes: {
		status: Match["status"];
		result: Match["result"];
		winnerWarbandId: string | null;
	}) => Promise<void>;
	onSetOutcome: (eventId: string, outcome: EventOutcome) => Promise<void>;
	participants: readonly WarbandMatch[];
	warbands: readonly Warband[];
	warriors: readonly Warrior[];
}) {
	const [isAddingEvent, setIsAddingEvent] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string>();
	const [result, setResult] = useState<Match["result"]>(() =>
		match.result === "Pending" ? "Victory" : match.result,
	);
	const [winnerWarbandId, setWinnerWarbandId] = useState<string | null>(
		match.winnerWarbandId,
	);
	const resultId = useId();
	const winnerId = useId();
	const participantWarbandIds = participants.map(
		(participant) => participant.warbandId,
	);
	const selectedWarbands = warbands.filter((warband) =>
		participantWarbandIds.includes(warband.id),
	);
	const canSave = isMatchResultConsistent(
		result,
		winnerWarbandId,
		participantWarbandIds,
	);

	useEffect(() => {
		if (!isOpen) return;
		setIsAddingEvent(false);
		setError(undefined);
		setResult(match.result === "Pending" ? "Victory" : match.result);
		setWinnerWarbandId(match.winnerWarbandId);
	}, [isOpen, match.result, match.winnerWarbandId]);

	return (
		<Dialog
			className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl"
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open) setIsAddingEvent(false);
				onOpenChange(open);
			}}
		>
			<DialogHeader>
				<DialogTitle>Complete {match.name}</DialogTitle>
				<DialogDescription>
					Review every event, choose a winner or draw, and save the match
					result. Injury and death outcomes are applied when they are saved.
				</DialogDescription>
			</DialogHeader>

			<div className="grid gap-6">
				<section aria-labelledby="match-result-heading" className="grid gap-4">
					<div>
						<h2
							className="font-serif text-2xl text-foreground"
							id="match-result-heading"
						>
							Match result
						</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							Mark the match as a victory for one participating warband, or
							record a draw.
						</p>
					</div>
					<div className="grid gap-5 md:grid-cols-2">
						<Field>
							<FieldLabel htmlFor={resultId}>Result</FieldLabel>
							<Select
								className="w-full"
								name="result"
								onChange={(key) => {
									if (key === null) return;
									const nextResult = String(key) as Match["result"];
									setResult(nextResult);
									if (nextResult !== "Victory") setWinnerWarbandId(null);
								}}
								value={result}
							>
								<SelectTrigger id={resultId}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{COMPLETION_RESULTS.map((completionResult) => (
										<SelectItem id={completionResult} key={completionResult}>
											{completionResult}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
						{result === "Victory" ? (
							<Field>
								<FieldLabel htmlFor={winnerId}>Winning warband</FieldLabel>
								<Select
									className="w-full"
									isDisabled={selectedWarbands.length === 0}
									name="winnerWarbandId"
									onChange={(key) =>
										setWinnerWarbandId(key === null ? null : String(key))
									}
									placeholder="Choose winner"
									value={winnerWarbandId ?? undefined}
								>
									<SelectTrigger id={winnerId}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{selectedWarbands.map((warband) => (
											<SelectItem id={warband.id} key={warband.id}>
												{warband.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FieldDescription>
									Only participating warbands can win the match.
								</FieldDescription>
							</Field>
						) : null}
					</div>
				</section>

				<div className="grid gap-4">
					<div className="flex flex-wrap items-end justify-between gap-3">
						<div>
							<h2 className="font-serif text-2xl text-foreground">
								Match events
							</h2>
							<p className="mt-1 text-sm text-muted-foreground">
								Resolved outcomes remain historical records and cannot be
								changed.
							</p>
						</div>
						<Button
							isDisabled={!canAddEvent}
							onPress={() => setIsAddingEvent((current) => !current)}
							variant="outline"
						>
							<Plus aria-hidden="true" data-icon="inline-start" />
							{isAddingEvent ? "Cancel adding event" : "Add event"}
						</Button>
					</div>

					{isAddingEvent ? (
						<section
							aria-label="Add a final match event"
							className="rounded-xl border border-border bg-muted/20 p-4"
						>
							<EventForm
								initialValues={initialEventValues}
								isMatchLocked
								key={`${match.id}:${events.length}`}
								matches={[match]}
								onSubmit={async (values) => {
									await onAddEvent(values);
									setIsAddingEvent(false);
								}}
								participants={participants}
								submitLabel="Add event"
								warbands={warbands}
								warriors={warriors}
							/>
						</section>
					) : null}

					<MatchEventsTable events={events} onSetOutcome={onSetOutcome} />
				</div>
			</div>

			<FieldError>{error}</FieldError>

			<DialogFooter>
				<Button onPress={() => onOpenChange(false)} variant="outline">
					Close
				</Button>
				<Button
					isDisabled={isSaving || !canSave}
					onPress={() => {
						void (async () => {
							setError(undefined);
							setIsSaving(true);
							try {
								await onSaveResult({
									status: "Completed",
									result,
									winnerWarbandId,
								});
								onOpenChange(false);
							} catch (cause) {
								setError(
									cause instanceof Error
										? cause.message
										: "Unable to save the match result.",
								);
							} finally {
								setIsSaving(false);
							}
						})();
					}}
				>
					{isSaving ? "Saving…" : "Save result"}
				</Button>
			</DialogFooter>
		</Dialog>
	);
}
