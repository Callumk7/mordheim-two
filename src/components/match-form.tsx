import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
	const [values, setValues] = useState<MatchFormValues>(() => ({
		name: initialValues.name,
		scenario: initialValues.scenario,
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
						cause instanceof Error ? cause.message : "Unable to save match.",
					);
				} finally {
					setIsSubmitting(false);
				}
			}}
		>
			<FieldGroup className="grid gap-5 md:grid-cols-2">
				<TextField
					label="Match name"
					name="name"
					onChange={(name) => setValues((current) => ({ ...current, name }))}
					value={values.name}
				/>
				<TextField
					label="Scenario"
					name="scenario"
					onChange={(scenario) =>
						setValues((current) => ({ ...current, scenario }))
					}
					value={values.scenario}
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
				</Field>
			</FieldGroup>

			<FieldError>{error}</FieldError>

			<div>
				<Button
					isDisabled={
						isSubmitting || !values.name.trim() || !values.scenario.trim()
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

export function formatStatus(status: Match["status"]) {
	return status === "InProgress" ? "In progress" : status;
}
