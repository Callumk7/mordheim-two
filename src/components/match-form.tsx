import { useState } from "react";
import { MATCH_STATUSES, type Match } from "../db/match";

export type MatchFormValues = Pick<Match, "name" | "scenario" | "status">;

export function MatchForm({
	initialValues,
	onSubmit,
	submitLabel,
}: {
	initialValues: MatchFormValues;
	onSubmit: (values: MatchFormValues) => Promise<void>;
	submitLabel: string;
}) {
	const [values, setValues] = useState(initialValues);
	const [error, setError] = useState<string>();
	const [isSubmitting, setIsSubmitting] = useState(false);

	return (
		<form
			className="grid gap-6"
			onSubmit={async (event) => {
				event.preventDefault();
				setError(undefined);
				setIsSubmitting(true);
				try {
					await onSubmit(values);
				} catch (cause) {
					setError(
						cause instanceof Error ? cause.message : "Unable to save match.",
					);
				} finally {
					setIsSubmitting(false);
				}
			}}
		>
			<div className="grid gap-5 md:grid-cols-2">
				<TextField
					label="Match name"
					onChange={(name) => setValues((current) => ({ ...current, name }))}
					value={values.name}
				/>
				<TextField
					label="Scenario"
					onChange={(scenario) =>
						setValues((current) => ({ ...current, scenario }))
					}
					value={values.scenario}
				/>
				<label className="grid gap-2 text-sm font-medium text-stone-300">
					Status
					<select
						className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-stone-100 outline-none focus:border-amber-500"
						onChange={(event) =>
							setValues((current) => ({
								...current,
								status: event.target.value as Match["status"],
							}))
						}
						value={values.status}
					>
						{MATCH_STATUSES.map((status) => (
							<option key={status} value={status}>
								{formatStatus(status)}
							</option>
						))}
					</select>
				</label>
			</div>

			{error ? (
				<p className="rounded-lg border border-rose-900/70 bg-rose-950/50 px-4 py-3 text-sm text-rose-300">
					{error}
				</p>
			) : null}

			<div>
				<button
					className="rounded-lg bg-amber-400 px-5 py-2.5 font-semibold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={
						isSubmitting || !values.name.trim() || !values.scenario.trim()
					}
					type="submit"
				>
					{isSubmitting ? "Saving…" : submitLabel}
				</button>
			</div>
		</form>
	);
}

function TextField({
	label,
	onChange,
	value,
}: {
	label: string;
	onChange: (value: string) => void;
	value: string;
}) {
	return (
		<label className="grid gap-2 text-sm font-medium text-stone-300">
			{label}
			<input
				className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-stone-100 outline-none focus:border-amber-500"
				onChange={(event) => onChange(event.target.value)}
				required
				value={value}
			/>
		</label>
	);
}

export function formatStatus(status: Match["status"]) {
	return status === "InProgress" ? "In progress" : status;
}
