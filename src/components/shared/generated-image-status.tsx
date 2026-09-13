import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import {
	isActiveImageJobStatus,
	useImageGenerationPolling,
} from "@/components/shared/use-image-generation-polling";

export type GeneratedImageJob = {
	jobId: string;
	status:
		| "pending"
		| "queued"
		| "enqueue_failed"
		| "consumed"
		| "processing"
		| "completed"
		| "failed";
	error: string | null;
};

const ACTIVE_STATUS_LABELS: Record<string, string> = {
	pending: "Waiting to begin",
	queued: "Queued for generation",
	processing: "Generating image",
};

const FAILURE_STATUS_LABELS: Record<string, string> = {
	failed: "generation failed",
	enqueue_failed: "could not be queued",
	consumed: "image is no longer available",
};

export function GeneratedImageStatus({
	job,
	alt,
	label,
}: {
	job: GeneratedImageJob;
	alt: string;
	label: string;
}) {
	const [failedImageId, setFailedImageId] = useState<string | null>(null);
	const isActive = isActiveImageJobStatus(job.status);
	useImageGenerationPolling(isActive);

	if (job.status === "completed") {
		return failedImageId === job.jobId ? (
			<p role="alert">{label} could not be displayed.</p>
		) : (
			<img
				className="aspect-square w-full max-w-xl rounded-xl bg-muted object-contain"
				src={`/api/generated-images/${encodeURIComponent(job.jobId)}`}
				alt={alt}
				onError={() => setFailedImageId(job.jobId)}
			/>
		);
	}

	if (isActive) {
		return (
			<output
				aria-live="polite"
				className="flex min-h-32 items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-6 text-muted-foreground"
			>
				<LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
				<span>
					{label}: {ACTIVE_STATUS_LABELS[job.status]}.
				</span>
			</output>
		);
	}

	const failure = FAILURE_STATUS_LABELS[job.status];
	if (failure) {
		return (
			<p
				className="rounded-lg border border-border bg-muted/30 p-4"
				role="alert"
			>
				{label} {failure}.
			</p>
		);
	}

	return <p role="alert">{label} status is unavailable.</p>;
}
