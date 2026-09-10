import { useState } from "react";
import { LinkButton } from "@/components/ui/button";

export type GeneratedImageJob = {
	jobId: string;
	status: string;
	error: string | null;
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
	const [imageFailed, setImageFailed] = useState(false);
	return (
		<>
			{job.status === "completed" ? (
				imageFailed ? (
					<p role="alert">Image unavailable. Refresh this page to try again.</p>
				) : (
					<img
						className="aspect-square w-full max-w-xl rounded-xl bg-muted object-contain"
						src={`/api/generated-images/${encodeURIComponent(job.jobId)}`}
						alt={alt}
						onError={() => setImageFailed(true)}
					/>
				)
			) : (
				<output className="block">
					{label} job: {job.status}. Refresh this page to check for the image.
				</output>
			)}
			{job.error && <p role="alert">{job.error}</p>}
			{["failed", "enqueue_failed", "consumed"].includes(job.status) && (
				<p className="text-sm text-muted-foreground">
					No retry control in this spike. Job: <code>{job.jobId}</code>.{" "}
					<LinkButton to="/queue-jobs" variant="link">
						View D1 jobs
					</LinkButton>
				</p>
			)}
		</>
	);
}
