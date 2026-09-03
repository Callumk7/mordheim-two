import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/ui/number-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
					<Select
						className="w-full"
						isRequired
						name="warbandId"
						onChange={(key) => {
							if (key !== null) {
								setValues((current) => ({
									...current,
									warbandId: String(key),
								}));
							}
						}}
						placeholder="Select a warband"
						value={values.warbandId || null}
					>
						<SelectTrigger id={warbandId}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{warbands.map((warband) => (
								<SelectItem id={warband.id} key={warband.id}>
									{warband.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
				<Field>
					<FieldLabel htmlFor={statusId}>Status</FieldLabel>
					<Select
						className="w-full"
						name="status"
						onChange={(key) => {
							if (key !== null) {
								setValues((current) => ({
									...current,
									status: String(key) as Warrior["status"],
								}));
							}
						}}
						value={values.status}
					>
						<SelectTrigger id={statusId}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{WARRIOR_STATUSES.map((status) => (
								<SelectItem id={status} key={status}>
									{status}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
				<NumberField
					isRequired
					label="Knocked"
					minValue={0}
					name="knocked"
					onChange={(knocked) =>
						setValues((current) => ({ ...current, knocked }))
					}
					value={values.knocked}
				/>
				<NumberField
					isRequired
					label="Injuries"
					minValue={0}
					name="injuries"
					onChange={(injuries) =>
						setValues((current) => ({ ...current, injuries }))
					}
					value={values.injuries}
				/>
				<NumberField
					isRequired
					label="Knock downs"
					minValue={0}
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
