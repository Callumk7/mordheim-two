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
import { Textarea } from "@/components/ui/textarea";
import type { Warband } from "@/db/validation/warband";

export type WarbandFormValues = Pick<
	Warband,
	"name" | "faction" | "bio" | "gold" | "rating" | "wins"
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
		bio: initialValues.bio,
		gold: initialValues.gold,
		rating: initialValues.rating,
		wins: initialValues.wins,
	}));
	const [error, setError] = useState<string>();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const bioId = useId();

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
				<Field className="md:col-span-2">
					<FieldLabel htmlFor={bioId}>Bio</FieldLabel>
					<Textarea
						id={bioId}
						name="bio"
						onChange={(event) =>
							setValues((current) => ({
								...current,
								bio: event.target.value,
							}))
						}
						placeholder="History, character, and distinguishing details…"
						value={values.bio ?? ""}
					/>
				</Field>
				<NumberField
					isRequired
					label="Gold crowns"
					minValue={0}
					name="gold"
					onChange={(gold) => setValues((current) => ({ ...current, gold }))}
					value={values.gold}
				/>
				<NumberField
					isRequired
					label="Rating"
					minValue={0}
					name="rating"
					onChange={(rating) =>
						setValues((current) => ({ ...current, rating }))
					}
					value={values.rating}
				/>
				<NumberField
					isRequired
					label="Wins"
					minValue={0}
					name="wins"
					onChange={(wins) => setValues((current) => ({ ...current, wins }))}
					value={values.wins}
				/>
			</FieldGroup>

			<FieldError>{error}</FieldError>

			<div>
				<Button
					isDisabled={
						isSubmitting || !values.name.trim() || !values.faction.trim()
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
