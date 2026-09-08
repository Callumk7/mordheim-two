import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
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
import {
	EVENT_OUTCOMES,
	type EventOutcome,
	EventOutcomeSchema,
} from "@/db/event";

export function EventOutcomeForm({
	isResolved,
	onSubmit,
	outcome,
}: {
	isResolved: boolean;
	onSubmit: (outcome: EventOutcome) => Promise<void>;
	outcome: EventOutcome | null;
}) {
	const [selectedOutcome, setSelectedOutcome] = useState<EventOutcome | null>(
		outcome,
	);
	const [error, setError] = useState<string>();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const selectId = useId();

	useEffect(() => setSelectedOutcome(outcome), [outcome]);

	const hasChanges = selectedOutcome !== null && !isResolved;

	return (
		<section aria-labelledby="event-outcome-heading" className="grid gap-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2
						className="font-serif text-2xl text-foreground"
						id="event-outcome-heading"
					>
						Outcome
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Choose the result of this event.
					</p>
				</div>
				<span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
					{isResolved ? "Resolved" : "Unresolved"}
				</span>
			</div>

			<form
				className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
				onSubmit={async (event) => {
					event.preventDefault();
					if (!selectedOutcome || !hasChanges) return;

					setError(undefined);
					setIsSubmitting(true);
					try {
						await onSubmit(selectedOutcome);
					} catch (cause) {
						setError(
							cause instanceof Error
								? cause.message
								: "Unable to save the outcome.",
						);
					} finally {
						setIsSubmitting(false);
					}
				}}
			>
				<Field>
					<FieldLabel htmlFor={selectId}>Event outcome</FieldLabel>
					<Select
						className="w-full"
						isDisabled={isResolved}
						isRequired
						onChange={(key) => {
							if (key !== null) {
								setSelectedOutcome(EventOutcomeSchema.parse(String(key)));
								setError(undefined);
							}
						}}
						placeholder="Pick an outcome"
						value={selectedOutcome}
					>
						<SelectTrigger id={selectId}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{EVENT_OUTCOMES.map((option) => (
								<SelectItem id={option} key={option}>
									{option}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<FieldDescription>
						{isResolved
							? "Resolved outcomes are immutable. Void and replace the event to correct it."
							: "Saving an outcome permanently resolves this event."}
					</FieldDescription>
				</Field>
				<Button isDisabled={isSubmitting || !hasChanges} type="submit">
					{isSubmitting ? "Saving…" : "Resolve event"}
				</Button>
				<FieldError className="sm:col-span-2">{error}</FieldError>
			</form>
		</section>
	);
}
