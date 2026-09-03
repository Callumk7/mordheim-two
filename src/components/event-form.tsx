import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Event } from "../db/event";
import type { Match } from "../db/match";
import type { Warband } from "../db/warband";

export type EventFormValues = Pick<
	Event,
	"matchId" | "attackerWarbandId" | "defenderWarbandId" | "notes"
>;

export function EventForm({
	initialValues,
	matches,
	warbands,
	onSubmit,
	submitLabel,
}: {
	initialValues: EventFormValues;
	matches: Match[];
	warbands: Warband[];
	onSubmit: (values: EventFormValues) => Promise<void>;
	submitLabel: string;
}) {
	const [values, setValues] = useState<EventFormValues>(() => ({
		matchId: initialValues.matchId,
		attackerWarbandId: initialValues.attackerWarbandId,
		defenderWarbandId: initialValues.defenderWarbandId,
		notes: initialValues.notes,
	}));
	const [error, setError] = useState<string>();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const notesId = useId();
	const hasDistinctWarbands =
		values.attackerWarbandId !== values.defenderWarbandId;
	const canSubmit =
		Boolean(values.matchId) &&
		Boolean(values.attackerWarbandId) &&
		Boolean(values.defenderWarbandId) &&
		hasDistinctWarbands;

	return (
		<form
			className="grid gap-6"
			onSubmit={async (event) => {
				event.preventDefault();
				setError(undefined);
				setIsSubmitting(true);
				try {
					await onSubmit({
						...values,
						notes: values.notes?.trim() || null,
					});
				} catch (cause) {
					setError(
						cause instanceof Error ? cause.message : "Unable to save event.",
					);
				} finally {
					setIsSubmitting(false);
				}
			}}
		>
			<FieldGroup className="grid gap-5 md:grid-cols-2">
				<SelectField
					label="Match"
					name="matchId"
					onChange={(matchId) =>
						setValues((current) => ({ ...current, matchId }))
					}
					options={matches.map((match) => ({
						label: `${match.name} — ${match.scenario}`,
						value: match.id,
					}))}
					placeholder="Select a match"
					value={values.matchId}
				/>
				<div className="hidden md:block" />
				<SelectField
					invalid={!hasDistinctWarbands}
					label="Attacking warband"
					name="attackerWarbandId"
					onChange={(attackerWarbandId) =>
						setValues((current) => ({ ...current, attackerWarbandId }))
					}
					options={warbands.map((warband) => ({
						label: warband.name,
						value: warband.id,
					}))}
					placeholder="Select the attacker"
					value={values.attackerWarbandId}
				/>
				<SelectField
					invalid={!hasDistinctWarbands}
					label="Defending warband"
					name="defenderWarbandId"
					onChange={(defenderWarbandId) =>
						setValues((current) => ({ ...current, defenderWarbandId }))
					}
					options={warbands.map((warband) => ({
						label: warband.name,
						value: warband.id,
					}))}
					placeholder="Select the defender"
					value={values.defenderWarbandId}
				/>
			</FieldGroup>

			<Field>
				<FieldLabel htmlFor={notesId}>Notes</FieldLabel>
				<FieldDescription>Optional</FieldDescription>
				<textarea
					id={notesId}
					name="notes"
					className="min-h-28 resize-y rounded-2xl border border-input bg-input/30 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
					onChange={(event) =>
						setValues((current) => ({
							...current,
							notes: event.target.value,
						}))
					}
					placeholder="Add any details about the knock down"
					value={values.notes ?? ""}
				/>
			</Field>

			{!hasDistinctWarbands ? (
				<FieldError>
					Attacker and defender must be different warbands.
				</FieldError>
			) : null}
			<FieldError>{error}</FieldError>

			<div>
				<Button isDisabled={isSubmitting || !canSubmit} type="submit">
					{isSubmitting ? "Saving…" : submitLabel}
				</Button>
			</div>
		</form>
	);
}

function SelectField({
	invalid = false,
	label,
	name,
	onChange,
	options,
	placeholder,
	value,
}: {
	invalid?: boolean;
	label: string;
	name: string;
	onChange: (value: string) => void;
	options: Array<{ label: string; value: string }>;
	placeholder: string;
	value: string;
}) {
	const id = useId();

	return (
		<Field data-invalid={invalid}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Select
				className="w-full"
				isInvalid={invalid}
				isRequired
				name={name}
				onSelectionChange={(key) => onChange(String(key))}
				placeholder={placeholder}
				selectedKey={value || null}
			>
				<SelectTrigger id={id}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem id={option.value} key={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</Field>
	);
}
