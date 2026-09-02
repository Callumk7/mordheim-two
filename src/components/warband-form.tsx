import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
	const [values, setValues] = useState<WarbandFormValues>(() => ({
		name: initialValues.name,
		faction: initialValues.faction,
		captain: initialValues.captain,
		rating: initialValues.rating,
		wins: initialValues.wins,
		status: initialValues.status,
	}));
	const [error, setError] = useState<string>();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const statusId = useId();

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
			<FieldGroup className="grid gap-5 md:grid-cols-2">
				<TextField
					label="Warband name"
					name="name"
					onChange={(name) => setValues((current) => ({ ...current, name }))}
					value={values.name}
				/>
				<TextField
					label="Faction"
					name="faction"
					onChange={(faction) =>
						setValues((current) => ({ ...current, faction }))
					}
					value={values.faction}
				/>
				<TextField
					label="Captain"
					name="captain"
					onChange={(captain) =>
						setValues((current) => ({ ...current, captain }))
					}
					value={values.captain}
				/>
				<Field>
					<FieldLabel htmlFor={statusId}>Status</FieldLabel>
					<select
						id={statusId}
						name="status"
						className="h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
				</Field>
				<NumberField
					label="Rating"
					name="rating"
					onChange={(rating) =>
						setValues((current) => ({ ...current, rating }))
					}
					value={values.rating}
				/>
				<NumberField
					label="Wins"
					name="wins"
					onChange={(wins) => setValues((current) => ({ ...current, wins }))}
					value={values.wins}
				/>
			</FieldGroup>

			<FieldError>{error}</FieldError>

			<div>
				<Button
					isDisabled={
						isSubmitting ||
						!values.name.trim() ||
						!values.faction.trim() ||
						!values.captain.trim()
					}
					type="submit"
				>
					{isSubmitting ? "Saving…" : submitLabel}
				</Button>
			</div>
		</form>
	);
}

function TextField({
	label,
	name,
	onChange,
	value,
}: {
	label: string;
	name: string;
	onChange: (value: string) => void;
	value: string;
}) {
	const id = useId();

	return (
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Input
				id={id}
				name={name}
				onChange={(event) => onChange(event.target.value)}
				required
				value={value}
			/>
		</Field>
	);
}

function NumberField({
	label,
	name,
	onChange,
	value,
}: {
	label: string;
	name: string;
	onChange: (value: number) => void;
	value: number;
}) {
	const id = useId();

	return (
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Input
				id={id}
				min="0"
				name={name}
				onChange={(event) => onChange(Number(event.target.value))}
				required
				type="number"
				value={value}
			/>
		</Field>
	);
}
