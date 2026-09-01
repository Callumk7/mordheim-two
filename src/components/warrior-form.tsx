import { useState } from "react";
import type { Warband } from "../db/warband";
import { WARRIOR_STATUSES, type Warrior } from "../db/warrior";

export type WarriorFormValues = Pick<
	Warrior,
	| "name"
	| "class"
	| "status"
	| "warbandId"
	| "knocked"
	| "injuries"
	| "knockedDowns"
>;

export function WarriorForm({
	initialValues,
	onSubmit,
	submitLabel,
	warbands,
}: {
	initialValues: WarriorFormValues;
	onSubmit: (values: WarriorFormValues) => Promise<void>;
	submitLabel: string;
	warbands: Warband[];
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
						cause instanceof Error ? cause.message : "Unable to save warrior.",
					);
				} finally {
					setIsSubmitting(false);
				}
			}}
		>
			<div className="grid gap-5 md:grid-cols-2">
				<TextField
					label="Warrior name"
					onChange={(name) => setValues((current) => ({ ...current, name }))}
					value={values.name}
				/>
				<TextField
					label="Class"
					onChange={(warriorClass) =>
						setValues((current) => ({
							...current,
							class: warriorClass,
						}))
					}
					value={values.class}
				/>
				<label className="grid gap-2 text-sm font-medium text-stone-300">
					Warband
					<select
						className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-stone-100 outline-none focus:border-amber-500"
						onChange={(event) =>
							setValues((current) => ({
								...current,
								warbandId: event.target.value,
							}))
						}
						required
						value={values.warbandId}
					>
						<option value="">Select a warband</option>
						{warbands.map((warband) => (
							<option key={warband.id} value={warband.id}>
								{warband.name}
							</option>
						))}
					</select>
				</label>
				<label className="grid gap-2 text-sm font-medium text-stone-300">
					Status
					<select
						className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-stone-100 outline-none focus:border-amber-500"
						onChange={(event) =>
							setValues((current) => ({
								...current,
								status: event.target.value as Warrior["status"],
							}))
						}
						value={values.status}
					>
						{WARRIOR_STATUSES.map((status) => (
							<option key={status} value={status}>
								{status}
							</option>
						))}
					</select>
				</label>
				<NumberField
					label="Knocked"
					onChange={(knocked) =>
						setValues((current) => ({ ...current, knocked }))
					}
					value={values.knocked}
				/>
				<NumberField
					label="Injuries"
					onChange={(injuries) =>
						setValues((current) => ({ ...current, injuries }))
					}
					value={values.injuries}
				/>
				<NumberField
					label="Knock downs"
					onChange={(knockedDowns) =>
						setValues((current) => ({ ...current, knockedDowns }))
					}
					value={values.knockedDowns}
				/>
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
						isSubmitting ||
						!values.name.trim() ||
						!values.class.trim() ||
						!values.warbandId
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

function NumberField({
	label,
	onChange,
	value,
}: {
	label: string;
	onChange: (value: number) => void;
	value: number;
}) {
	return (
		<label className="grid gap-2 text-sm font-medium text-stone-300">
			{label}
			<input
				className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-stone-100 outline-none focus:border-amber-500"
				min="0"
				onChange={(event) => onChange(Number(event.target.value))}
				required
				type="number"
				value={value}
			/>
		</label>
	);
}
