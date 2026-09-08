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
import {
	MATCH_RESULTS,
	MATCH_STATUSES,
	type Match,
} from "@/db/validation/match";
import type { Warband } from "@/db/validation/warband";
import {
	canSubmitMatch,
	changeMatchParticipantSelection,
	isMatchParticipantLocked,
	type MatchFormValues,
} from "@/lib/match-form";
import { cn } from "@/lib/utils";

export type { MatchFormValues } from "@/lib/match-form";

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
		result: initialValues.result,
		winnerWarbandId: initialValues.winnerWarbandId,
		participantWarbandIds: initialValues.participantWarbandIds,
	}));
	const [error, setError] = useState<string>();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const statusId = useId();
	const resultId = useId();
	const winnerId = useId();
	const canSubmit = canSubmitMatch(values);
	const selectedWarbands = warbands.filter((warband) =>
		values.participantWarbandIds.includes(warband.id),
	);

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
				<Field>
					<FieldLabel htmlFor={resultId}>Result</FieldLabel>
					<Select
						className="w-full"
						name="result"
						onChange={(key) => {
							if (key !== null) {
								const result = String(key) as Match["result"];
								setValues((current) => ({
									...current,
									result,
									winnerWarbandId:
										result === "Victory" ? current.winnerWarbandId : null,
								}));
							}
						}}
						value={values.result}
					>
						<SelectTrigger id={resultId}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{MATCH_RESULTS.map((result) => (
								<SelectItem id={result} key={result}>
									{result}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
				{values.result === "Victory" ? (
					<Field>
						<FieldLabel htmlFor={winnerId}>Winning warband</FieldLabel>
						<Select
							className="w-full"
							isDisabled={selectedWarbands.length === 0}
							name="winnerWarbandId"
							onChange={(key) =>
								setValues((current) => ({
									...current,
									winnerWarbandId: key === null ? null : String(key),
								}))
							}
							placeholder="Choose winner"
							value={values.winnerWarbandId ?? undefined}
						>
							<SelectTrigger id={winnerId}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{selectedWarbands.map((warband) => (
									<SelectItem id={warband.id} key={warband.id}>
										{warband.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FieldDescription>
							Only participating warbands can win the match.
						</FieldDescription>
					</Field>
				) : null}
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
						const isLocked = isMatchParticipantLocked(
							warband.id,
							values.participantWarbandIds,
							lockedParticipantWarbandIds,
						);
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
										setValues((current) => {
											const participantWarbandIds =
												changeMatchParticipantSelection(
													current.participantWarbandIds,
													warband.id,
													isSelected,
													lockedParticipantWarbandIds,
												);
											return {
												...current,
												participantWarbandIds,
												winnerWarbandId:
													current.winnerWarbandId !== null &&
													participantWarbandIds.includes(
														current.winnerWarbandId,
													)
														? current.winnerWarbandId
														: null,
											};
										})
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
				<Button isDisabled={isSubmitting || !canSubmit} type="submit">
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
