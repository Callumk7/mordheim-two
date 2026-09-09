import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { TextField } from "react-aria-components";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ImageGenerationInputSchema } from "@/db/validation/image-generation";
import { createImageGenerationJob } from "@/server/image-generation";

export const Route = createFileRoute("/queue")({
	component: QueuePage,
});

function QueuePage() {
	const [prompt, setPrompt] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [message, setMessage] = useState("");
	const submitting = useRef(false);

	async function submit() {
		if (submitting.current) return;
		const input = ImageGenerationInputSchema.safeParse({ prompt });
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
					queue. When explicitly enabled, the consumer generates a square JPEG
					with Gemini and saves it to private R2 storage. Disabled jobs are
					marked failed, not held for later generation.
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
				stay local, but enabling Gemini makes paid network calls even in
				development. This endpoint has no application authentication; protect
				the app and submission RPC with Access/authorization before enabling
				generation.
			</p>
		</section>
	);
}
