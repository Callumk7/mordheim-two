import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
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
	warbands: Warband[];
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

			<fieldset className="grid gap-3">
				<legend className="text-sm font-medium text-foreground">
					Participating warbands
				</legend>
				<p className="text-sm text-muted-foreground">
					Select the warbands taking part. At least two are needed before an
					event can be recorded.
				</p>
				<div className="grid gap-2 sm:grid-cols-2">
					{warbands.map((warband) => {
						const isChecked = values.participantWarbandIds.includes(warband.id);
						const isLocked = isChecked && lockedParticipantIds.has(warband.id);
						return (
							<label
								className={cn(
									"flex cursor-pointer items-center gap-3 rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm text-foreground",
									isLocked && "cursor-not-allowed opacity-70",
								)}
								key={warband.id}
							>
								<input
									checked={isChecked}
									className="size-4 accent-primary"
									disabled={isLocked}
									onChange={() =>
										setValues((current) => ({
											...current,
											participantWarbandIds: isChecked
												? current.participantWarbandIds.filter(
														(id) => id !== warband.id,
													)
												: [...current.participantWarbandIds, warband.id],
										}))
									}
									type="checkbox"
								/>
								<span className="grid gap-0.5">
									<span>{warband.name}</span>
									{isLocked ? (
										<span className="text-xs text-muted-foreground">
											Used by an event in this match
										</span>
									) : null}
								</span>
							</label>
						);
					})}
				</div>
			</fieldset>

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
