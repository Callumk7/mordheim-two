import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
	const [values, setValues] = useState<WarriorFormValues>(() => ({
		name: initialValues.name,
		class: initialValues.class,
		status: initialValues.status,
		warbandId: initialValues.warbandId,
		knocked: initialValues.knocked,
		injuries: initialValues.injuries,
		knockedDowns: initialValues.knockedDowns,
	}));
	const [error, setError] = useState<string>();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const warbandId = useId();
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
						cause instanceof Error ? cause.message : "Unable to save warrior.",
					);
				} finally {
					setIsSubmitting(false);
				}
			}}
		>
			<FieldGroup className="grid gap-5 md:grid-cols-2">
				<TextField
					label="Warrior name"
					name="name"
					onChange={(name) => setValues((current) => ({ ...current, name }))}
					value={values.name}
				/>
				<TextField
					label="Class"
					name="class"
					onChange={(warriorClass) =>
						setValues((current) => ({ ...current, class: warriorClass }))
					}
					value={values.class}
				/>
				<Field>
					<FieldLabel htmlFor={warbandId}>Warband</FieldLabel>
					<select
						id={warbandId}
						name="warbandId"
						className="h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
				</Field>
				<Field>
					<FieldLabel htmlFor={statusId}>Status</FieldLabel>
					<select
						id={statusId}
						name="status"
						className="h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
				</Field>
				<NumberField
					label="Knocked"
					name="knocked"
					onChange={(knocked) =>
						setValues((current) => ({ ...current, knocked }))
					}
					value={values.knocked}
				/>
				<NumberField
					label="Injuries"
					name="injuries"
					onChange={(injuries) =>
						setValues((current) => ({ ...current, injuries }))
					}
					value={values.injuries}
				/>
				<NumberField
					label="Knock downs"
					name="knockedDowns"
					onChange={(knockedDowns) =>
						setValues((current) => ({ ...current, knockedDowns }))
					}
					value={values.knockedDowns}
				/>
			</FieldGroup>

			<FieldError>{error}</FieldError>

			<div>
				<Button
					isDisabled={
						isSubmitting ||
						!values.name.trim() ||
						!values.class.trim() ||
						!values.warbandId
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
