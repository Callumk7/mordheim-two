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

			<label className="grid gap-2 text-sm font-medium text-stone-300">
				Notes <span className="font-normal text-stone-500">(optional)</span>
				<textarea
					className="min-h-28 resize-y rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-stone-100 outline-none focus:border-amber-500"
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
				<p className="rounded-lg border border-amber-900/70 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
					Attacker and defender must be different warbands.
				</p>
			) : null}

			{error ? (
				<p className="rounded-lg border border-rose-900/70 bg-rose-950/50 px-4 py-3 text-sm text-rose-300">
					{error}
				</p>
			) : null}

			<div>
				<button
					className="rounded-lg bg-amber-400 px-5 py-2.5 font-semibold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
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
		<label className="grid gap-2 text-sm font-medium text-stone-300">
			{label}
			<select
				className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-stone-100 outline-none focus:border-amber-500"
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
