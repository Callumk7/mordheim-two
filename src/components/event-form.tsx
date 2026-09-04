import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Event } from "@/db/event";
import type { Match } from "@/db/match";
import type { Warband } from "@/db/warband";
import type { WarbandMatch } from "@/db/warband-match";
import type { Warrior } from "@/db/warrior";
import {
	getParticipantWarbandIds,
	getWarriorsForWarband,
} from "@/lib/event-options";

export type EventFormValues = Pick<
	Event,
	| "matchId"
	| "attackerWarbandId"
	| "attackerWarriorId"
	| "defenderWarbandId"
	| "defenderWarriorId"
	| "notes"
>;

export function EventForm({
	initialValues,
	matches,
	participants,
	warbands,
	warriors,
	onSubmit,
	submitLabel,
}: {
	initialValues: EventFormValues;
	matches: Match[];
	participants: WarbandMatch[];
	warbands: Warband[];
	warriors: Warrior[];
	onSubmit: (values: EventFormValues) => Promise<void>;
	submitLabel: string;
}) {
	const [values, setValues] = useState<EventFormValues>(() => initialValues);
	const [error, setError] = useState<string>();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const notesId = useId();
	const participantWarbandIds = getParticipantWarbandIds(
		values.matchId,
		participants,
	);
	const participantWarbands = warbands.filter(
		(warband) =>
			participantWarbandIds.includes(warband.id) &&
			warriors.some((warrior) => warrior.warbandId === warband.id),
	);
	const attackerWarriors = getWarriorsForWarband(
		values.attackerWarbandId,
		warriors,
	);
	const defenderWarriors = getWarriorsForWarband(
		values.defenderWarbandId,
		warriors,
	);
	const hasDistinctWarbands =
		values.attackerWarbandId !== values.defenderWarbandId;
	const hasDuplicateWarbands =
		Boolean(values.attackerWarbandId) &&
		Boolean(values.defenderWarbandId) &&
		!hasDistinctWarbands;
	const canSubmit =
		participantWarbandIds.includes(values.attackerWarbandId) &&
		participantWarbandIds.includes(values.defenderWarbandId) &&
		hasDistinctWarbands &&
		attackerWarriors.some(
			(warrior) => warrior.id === values.attackerWarriorId,
		) &&
		defenderWarriors.some((warrior) => warrior.id === values.defenderWarriorId);

	return (
		<form
			className="grid gap-6"
			onSubmit={async (event) => {
				event.preventDefault();
				setError(undefined);
				setIsSubmitting(true);
				try {
					await onSubmit({
						...values,
						notes: values.notes?.trim() || null,
					});
				} catch (cause) {
					setError(
						cause instanceof Error ? cause.message : "Unable to save event.",
					);
				} finally {
					setIsSubmitting(false);
				}
			}}
		>
			<FieldGroup className="grid gap-5 md:grid-cols-2">
				<SelectField
					label="Match"
					name="matchId"
					onChange={(matchId) => {
						const nextWarbandIds = getParticipantWarbandIds(
							matchId,
							participants,
						).filter((warbandId) =>
							warriors.some((warrior) => warrior.warbandId === warbandId),
						);
						const attackerWarbandId = nextWarbandIds[0] ?? "";
						const defenderWarbandId = nextWarbandIds[1] ?? "";
						setValues((current) => ({
							...current,
							matchId,
							attackerWarbandId,
							attackerWarriorId:
								getWarriorsForWarband(attackerWarbandId, warriors)[0]?.id ?? "",
							defenderWarbandId,
							defenderWarriorId:
								getWarriorsForWarband(defenderWarbandId, warriors)[0]?.id ?? "",
						}));
					}}
					options={matches.map((match) => ({
						label: `${match.name} — ${match.scenario}`,
						value: match.id,
					}))}
					placeholder="Select a match"
					value={values.matchId}
				/>
				<div className="hidden md:block" />
				<SelectField
					label="Attacking warband"
					name="attackerWarbandId"
					onChange={(attackerWarbandId) =>
						setValues((current) => ({
							...current,
							attackerWarbandId,
							attackerWarriorId:
								getWarriorsForWarband(attackerWarbandId, warriors)[0]?.id ?? "",
						}))
					}
					options={participantWarbands.map((warband) => ({
						label: warband.name,
						value: warband.id,
					}))}
					placeholder="Select the attacker"
					value={values.attackerWarbandId}
				/>
				<SelectField
					label="Attacking warrior"
					name="attackerWarriorId"
					onChange={(attackerWarriorId) =>
						setValues((current) => ({ ...current, attackerWarriorId }))
					}
					options={attackerWarriors.map((warrior) => ({
						label: warrior.name,
						value: warrior.id,
					}))}
					placeholder="Select the attacking warrior"
					value={values.attackerWarriorId}
				/>
				<SelectField
					errorMessage={
						hasDuplicateWarbands
							? "Attacker and defender must be different warbands."
							: undefined
					}
					invalid={hasDuplicateWarbands}
					label="Defending warband"
					name="defenderWarbandId"
					onChange={(defenderWarbandId) =>
						setValues((current) => ({
							...current,
							defenderWarbandId,
							defenderWarriorId:
								getWarriorsForWarband(defenderWarbandId, warriors)[0]?.id ?? "",
						}))
					}
					options={participantWarbands.map((warband) => ({
						label: warband.name,
						value: warband.id,
					}))}
					placeholder="Select the defender"
					value={values.defenderWarbandId}
				/>
				<SelectField
					label="Defending warrior"
					name="defenderWarriorId"
					onChange={(defenderWarriorId) =>
						setValues((current) => ({ ...current, defenderWarriorId }))
					}
					options={defenderWarriors.map((warrior) => ({
						label: warrior.name,
						value: warrior.id,
					}))}
					placeholder="Select the defending warrior"
					value={values.defenderWarriorId}
				/>
			</FieldGroup>

			<Field>
				<FieldLabel htmlFor={notesId}>Notes</FieldLabel>
				<FieldDescription>Optional</FieldDescription>
				<textarea
					id={notesId}
					name="notes"
					className="min-h-28 resize-y rounded-2xl border border-input bg-input/30 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
					onChange={(event) =>
						setValues((current) => ({
							...current,
							notes: event.target.value,
						}))
					}
					placeholder="Add any details about the knock down"
					value={values.notes ?? ""}
				/>
			</Field>

			<FieldError>{error}</FieldError>

			<div>
				<Button isDisabled={isSubmitting || !canSubmit} type="submit">
					{isSubmitting ? "Saving…" : submitLabel}
				</Button>
			</div>
		</form>
	);
}

function SelectField({
	errorMessage,
	invalid = false,
	label,
	name,
	onChange,
	options,
	placeholder,
	value,
}: {
	errorMessage?: string;
	invalid?: boolean;
	label: string;
	name: string;
	onChange: (value: string) => void;
	options: Array<{ label: string; value: string }>;
	placeholder: string;
	value: string;
}) {
	const id = useId();
	const errorId = useId();

	return (
		<Field data-invalid={invalid}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Select
				aria-errormessage={errorMessage ? errorId : undefined}
				className="w-full"
				isInvalid={invalid}
				isRequired
				name={name}
				onChange={(key) => {
					if (key !== null) onChange(String(key));
				}}
				placeholder={placeholder}
				value={value || null}
			>
				<SelectTrigger id={id}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem id={option.value} key={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{errorMessage ? (
				<FieldError id={errorId}>{errorMessage}</FieldError>
			) : null}
		</Field>
	);
}
