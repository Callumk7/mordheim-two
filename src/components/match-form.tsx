import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MATCH_STATUSES, type Match } from "../db/match";
import type { Warband } from "../db/warband";

export type MatchFormValues = Pick<Match, "name" | "scenario" | "status"> & {
	participantWarbandIds: string[];
};

export function MatchForm({
	initialValues,
	lockedParticipantWarbandIds = [],
	onSubmit,
	submitLabel,
	warbands,
}: {
	initialValues: MatchFormValues;
	lockedParticipantWarbandIds?: string[];
	onSubmit: (values: MatchFormValues) => Promise<void>;
	submitLabel: string;
	warbands: readonly Warband[];
}) {
	const [values, setValues] = useState<MatchFormValues>(() => ({
		name: initialValues.name,
		scenario: initialValues.scenario,
		status: initialValues.status,
		participantWarbandIds: initialValues.participantWarbandIds,
	}));
	const [error, setError] = useState<string>();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const statusId = useId();
	const lockedParticipantIds = new Set(lockedParticipantWarbandIds);

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
					<Select
						className="w-full"
						name="status"
						onChange={(key) => {
							if (key !== null) {
								setValues((current) => ({
									...current,
									status: String(key) as Match["status"],
								}));
							}
						}}
						value={values.status}
					>
						<SelectTrigger id={statusId}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{MATCH_STATUSES.map((status) => (
								<SelectItem id={status} key={status}>
									{formatStatus(status)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
			</FieldGroup>

			<FieldSet className="gap-3">
				<FieldLegend className="mb-0" variant="label">
					Participating warbands
				</FieldLegend>
				<FieldDescription>
					Select the warbands taking part. At least two are needed before an
					event can be recorded.
				</FieldDescription>
				<FieldGroup className="grid gap-2 sm:grid-cols-2">
					{warbands.map((warband) => {
						const isChecked = values.participantWarbandIds.includes(warband.id);
						const isLocked = isChecked && lockedParticipantIds.has(warband.id);
						const checkboxId = `participant-${warband.id}`;
						return (
							<Field
								className={cn(
									"rounded-xl border border-input bg-input/30 px-3 py-2.5",
									isLocked && "opacity-70",
								)}
								data-disabled={isLocked || undefined}
								key={warband.id}
								orientation="horizontal"
							>
								<Checkbox
									id={checkboxId}
									isDisabled={isLocked}
									isSelected={isChecked}
									onChange={(isSelected) =>
										setValues((current) => ({
											...current,
											participantWarbandIds: isSelected
												? [...current.participantWarbandIds, warband.id]
												: current.participantWarbandIds.filter(
														(id) => id !== warband.id,
													),
										}))
									}
								/>
								<FieldContent>
									<FieldLabel htmlFor={checkboxId}>{warband.name}</FieldLabel>
									{isLocked ? (
										<FieldDescription>
											Used by an event in this match
										</FieldDescription>
									) : null}
								</FieldContent>
							</Field>
						);
					})}
				</FieldGroup>
			</FieldSet>

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
