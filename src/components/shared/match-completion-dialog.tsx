import { Plus } from "lucide-react";
import { useState } from "react";
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
import type { EventOutcome } from "@/db/validation/event";
import type { Match } from "@/db/validation/match";
import type { Warband } from "@/db/validation/warband";
import type { WarbandMatch } from "@/db/validation/warband-match";
import type { Warrior } from "@/db/validation/warrior";
import type { MatchEventRow } from "@/db-collections/projections";

export function MatchCompletionDialog({
	canAddEvent,
	events,
	initialEventValues,
	isOpen,
	match,
	onAddEvent,
	onOpenChange,
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
	onSetOutcome: (eventId: string, outcome: EventOutcome) => Promise<void>;
	participants: readonly WarbandMatch[];
	warbands: readonly Warband[];
	warriors: readonly Warrior[];
}) {
	const [isAddingEvent, setIsAddingEvent] = useState(false);

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
					Review every event and resolve its outcome. Injury and death outcomes
					are applied when they are saved.
				</DialogDescription>
			</DialogHeader>

			<div className="grid gap-4">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<h2 className="font-serif text-2xl text-foreground">
							Match events
						</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							Resolved outcomes remain historical records and cannot be changed.
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

			<DialogFooter>
				<Button onPress={() => onOpenChange(false)}>Done</Button>
			</DialogFooter>
		</Dialog>
	);
}
