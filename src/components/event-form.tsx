import { useState } from "react";
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
	const [values, setValues] = useState(initialValues);
	const [error, setError] = useState<string>();
	const [isSubmitting, setIsSubmitting] = useState(false);
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
			<div className="grid gap-5 md:grid-cols-2">
				<SelectField
					label="Match"
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
					label="Attacking warband"
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
					label="Defending warband"
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
			</div>

			<label className="grid gap-2 text-sm font-medium text-foreground">
				Notes{" "}
				<span className="font-normal text-muted-foreground">(optional)</span>
				<textarea
					className="min-h-28 resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none focus:border-ring"
					onChange={(event) =>
						setValues((current) => ({
							...current,
							notes: event.target.value,
						}))
					}
					placeholder="Add any details about the knock down"
					value={values.notes ?? ""}
				/>
			</label>

			{!hasDistinctWarbands ? (
				<p className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
					Attacker and defender must be different warbands.
				</p>
			) : null}

			{error ? (
				<p className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					{error}
				</p>
			) : null}

			<div>
				<button
					className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={isSubmitting || !canSubmit}
					type="submit"
				>
					{isSubmitting ? "Saving…" : submitLabel}
				</button>
			</div>
		</form>
	);
}

function SelectField({
	label,
	onChange,
	options,
	placeholder,
	value,
}: {
	label: string;
	onChange: (value: string) => void;
	options: Array<{ label: string; value: string }>;
	placeholder: string;
	value: string;
}) {
	return (
		<label className="grid gap-2 text-sm font-medium text-foreground">
			{label}
			<select
				className="rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none focus:border-ring"
				onChange={(event) => onChange(event.target.value)}
				required
				value={value}
			>
				<option value="">{placeholder}</option>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</label>
	);
}
