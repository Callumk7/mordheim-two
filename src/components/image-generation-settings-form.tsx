import { useRef, useState } from "react";
import { TextField } from "react-aria-components";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
	IMAGE_GENERATION_INSTRUCTIONS_MAX_LENGTH,
	ImageGenerationInstructionsInputSchema,
} from "@/db/validation/image-generation";

export function ImageGenerationSettingsForm({
	initialInstructions,
	isCustom,
	onSave,
}: {
	initialInstructions: string;
	isCustom: boolean;
	onSave: (instructions: string) => Promise<void>;
}) {
	const [instructions, setInstructions] = useState(initialInstructions);
	const [error, setError] = useState("");
	const [message, setMessage] = useState(
		isCustom
			? "Showing saved instructions."
			: "Showing the default John Blanche refinement brief.",
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const submitting = useRef(false);

	async function submit() {
		if (submitting.current) return;
		const input = ImageGenerationInstructionsInputSchema.safeParse({
			instructions,
		});
		if (!input.success) {
			setError(
				input.error.issues[0]?.message ??
					"Enter image-generation instructions.",
			);
			setMessage("");
			return;
		}

		submitting.current = true;
		setIsSubmitting(true);
		setError("");
		setMessage("");
		try {
			await onSave(input.data.instructions);
			setInstructions(input.data.instructions);
			setMessage("Saved image-generation instructions.");
		} catch {
			setError(
				"Could not save instructions. Check D1 and try again without resubmitting blindly if the write may have succeeded.",
			);
		} finally {
			submitting.current = false;
			setIsSubmitting(false);
		}
	}

	return (
		<form
			className="space-y-4 rounded-xl border border-border bg-card p-6"
			onSubmit={(event) => {
				event.preventDefault();
				void submit();
			}}
		>
			<TextField
				value={instructions}
				onChange={(value) => {
					setInstructions(value);
					setError("");
				}}
				isRequired
				isDisabled={isSubmitting}
				isInvalid={Boolean(error)}
			>
				<Field>
					<FieldLabel>Base image-generation instructions</FieldLabel>
					<FieldDescription>
						Used as the prompt-refiner system brief for every subsequent
						generation job, including portraits, match aftermaths, event
						illustrations, and the queue playground. Maximum{" "}
						{IMAGE_GENERATION_INSTRUCTIONS_MAX_LENGTH} characters.
					</FieldDescription>
					<Textarea
						name="instructions"
						rows={12}
						className="min-h-64 font-mono text-sm"
					/>
					<FieldError>{error}</FieldError>
				</Field>
			</TextField>
			<p className="text-xs text-muted-foreground">
				{instructions.trim().length} /{" "}
				{IMAGE_GENERATION_INSTRUCTIONS_MAX_LENGTH}
			</p>
			<Button type="submit" isDisabled={isSubmitting}>
				{isSubmitting ? "Saving…" : "Save instructions"}
			</Button>
			<output className="block break-words text-sm">{message}</output>
		</form>
	);
}
