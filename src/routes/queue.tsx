import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { TextField } from "react-aria-components";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	GEMINI_IMAGE_MODEL,
	IMAGE_GENERATION_MODELS,
	ImageGenerationInputSchema,
	type ImageGenerationModel,
	OPENAI_IMAGE_MODEL,
} from "@/db/validation/image-generation";
import { createImageGenerationJob } from "@/server/image-generation";

export const Route = createFileRoute("/queue")({
	component: QueuePage,
});

function QueuePage() {
	const [prompt, setPrompt] = useState("");
	const [model, setModel] = useState<ImageGenerationModel>(GEMINI_IMAGE_MODEL);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [message, setMessage] = useState("");
	const submitting = useRef(false);

	async function submit() {
		if (submitting.current) return;
		const input = ImageGenerationInputSchema.safeParse({ prompt, model });
		if (!input.success) {
			setMessage("Enter a prompt between 1 and 4,000 characters.");
			return;
		}

		submitting.current = true;
		setIsSubmitting(true);
		setMessage("");
		try {
			const result = await createImageGenerationJob({ data: input.data });
			setMessage(
				result.status === "queued"
					? `Queued job ${result.jobId}. Check D1 jobs for the generation outcome and private R2 key. Generation is disabled by default.`
					: `Job ${result.jobId}: enqueue failed. Delivery may be uncertain; check D1 and the queue before resubmitting.`,
			);
		} catch {
			setMessage(
				"Could not confirm submission. The job may already be queued; check D1 and the queue before resubmitting.",
			);
		} finally {
			submitting.current = false;
			setIsSubmitting(false);
		}
	}

	return (
		<section className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
			<header className="space-y-2">
				<h1 className="text-3xl">Queue playground</h1>
				<div className="flex flex-wrap gap-2">
					<LinkButton to="/queue-jobs" variant="outline">
						View D1 jobs
					</LinkButton>
					<LinkButton to="/generated-images" variant="outline">
						View generated images
					</LinkButton>
				</div>
				<p className="text-sm text-muted-foreground">
					Save an image prompt in D1 and send its job ID to the image generation
					queue. Choose the image model for this job; when explicitly enabled,
					the consumer generates a square JPEG and saves it to private R2
					storage. Disabled jobs are marked failed, not held for later
					generation.
				</p>
			</header>
			<form
				className="space-y-4 rounded-xl border border-border bg-card p-6"
				onSubmit={(event) => {
					event.preventDefault();
					void submit();
				}}
			>
				<TextField
					value={prompt}
					onChange={setPrompt}
					isRequired
					isDisabled={isSubmitting}
					maxLength={4000}
				>
					<Field>
						<FieldLabel>Image prompt</FieldLabel>
						<Textarea
							name="prompt"
							rows={5}
							placeholder="A grim woodcut portrait of a Mordheim mercenary"
						/>
					</Field>
				</TextField>
				<Field>
					<FieldLabel htmlFor="image-model">Image model</FieldLabel>
					<Select
						className="w-full"
						isDisabled={isSubmitting}
						onChange={(key) => {
							const selected = IMAGE_GENERATION_MODELS.find(
								(candidate) => candidate === key,
							);
							if (selected) setModel(selected);
						}}
						value={model}
					>
						<SelectTrigger id="image-model">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem id={GEMINI_IMAGE_MODEL}>
								Gemini 3.1 Flash Image
							</SelectItem>
							<SelectItem id={OPENAI_IMAGE_MODEL}>GPT Image 2</SelectItem>
						</SelectContent>
					</Select>
				</Field>
				<Button type="submit" isDisabled={isSubmitting || !prompt.trim()}>
					{isSubmitting ? "Sending…" : "Send to queue"}
				</Button>
				<output className="block break-words text-sm">{message}</output>
			</form>
			<p className="text-sm text-muted-foreground">
				On the deployed app, check the Cloudflare dashboard for the
				mordheim-image-generation queue’s message writes and backlog, and D1 for
				the job record. Completed means the image and result metadata are
				stored. Consumed is a historical receipt only. Local queues and storage
				stay local, but enabling either provider makes paid network calls even
				in development. This endpoint has no application authentication; protect
				the app and submission RPC with Access/authorization before enabling
				generation.
			</p>
		</section>
	);
}
