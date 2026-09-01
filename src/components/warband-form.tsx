import { useState } from "react";
import { WARBAND_STATUSES, type Warband } from "../db/warband";

export type WarbandFormValues = Pick<
	Warband,
	"name" | "faction" | "captain" | "rating" | "wins" | "status"
>;

export function WarbandForm({
	initialValues,
	onSubmit,
	submitLabel,
}: {
	initialValues: WarbandFormValues;
	onSubmit: (values: WarbandFormValues) => Promise<void>;
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
						cause instanceof Error ? cause.message : "Unable to save warband.",
					);
				} finally {
					setIsSubmitting(false);
				}
			}}
		>
			<div className="grid gap-5 md:grid-cols-2">
				<TextField
					label="Warband name"
					onChange={(name) => setValues((current) => ({ ...current, name }))}
					value={values.name}
				/>
				<TextField
					label="Faction"
					onChange={(faction) =>
						setValues((current) => ({ ...current, faction }))
					}
					value={values.faction}
				/>
				<TextField
					label="Captain"
					onChange={(captain) =>
						setValues((current) => ({ ...current, captain }))
					}
					value={values.captain}
				/>
				<label className="grid gap-2 text-sm font-medium text-foreground">
					Status
					<select
						className="rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none focus:border-ring"
						onChange={(event) =>
							setValues((current) => ({
								...current,
								status: event.target.value as Warband["status"],
							}))
						}
						value={values.status}
					>
						{WARBAND_STATUSES.map((status) => (
							<option key={status} value={status}>
								{status}
							</option>
						))}
					</select>
				</label>
				<NumberField
					label="Rating"
					onChange={(rating) =>
						setValues((current) => ({ ...current, rating }))
					}
					value={values.rating}
				/>
				<NumberField
					label="Wins"
					onChange={(wins) => setValues((current) => ({ ...current, wins }))}
					value={values.wins}
				/>
			</div>

			{error ? (
				<p className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					{error}
				</p>
			) : null}

			<div>
				<button
					className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={
						isSubmitting ||
						!values.name.trim() ||
						!values.faction.trim() ||
						!values.captain.trim()
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
		<label className="grid gap-2 text-sm font-medium text-foreground">
			{label}
			<input
				className="rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none focus:border-ring"
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
		<label className="grid gap-2 text-sm font-medium text-foreground">
			{label}
			<input
				className="rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none focus:border-ring"
				min="0"
				onChange={(event) => onChange(Number(event.target.value))}
				required
				type="number"
				value={value}
			/>
		</label>
	);
}
