import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	createWarriorPortrait,
	type getWarriorPortrait,
} from "@/server/warrior-portraits";

export function WarriorPortrait({
	warriorId,
	name,
	portrait,
}: {
	warriorId: string;
	name: string;
	portrait: Awaited<ReturnType<typeof getWarriorPortrait>>;
}) {
	const router = useRouter();
	const submit = useServerFn(createWarriorPortrait);
	const [submitting, setSubmitting] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [submitted, setSubmitted] = useState(false);
	const [imageFailed, setImageFailed] = useState(false);
	const job = portrait.job;
	return (
		<Card className="mt-7">
			<CardContent className="space-y-4">
				<h2 className="font-serif text-2xl text-foreground">Portrait</h2>
				{portrait.error ? (
					<p role="alert">{portrait.error}</p>
				) : job ? (
					<>
						{job.status === "completed" ? (
							imageFailed ? (
								<p role="alert">
									Image unavailable. Refresh this page to try again.
								</p>
							) : (
								<img
									className="aspect-square w-full max-w-sm rounded-xl object-contain bg-muted"
									src={`/api/generated-images/${encodeURIComponent(job.jobId)}`}
									alt={`Portrait of ${name}`}
									onError={() => setImageFailed(true)}
								/>
							)
						) : (
							<output className="block">
								Portrait job: {job.status}. Refresh this page to check for your
								portrait.
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
				) : (
					<>
						<p className="text-sm text-muted-foreground">
							Uses saved profile details. Save changes before generating.
						</p>
						<Button
							isDisabled={submitting || submitted}
							onPress={async () => {
								setSubmitting(true);
								setSubmitted(true);
								setMessage(null);
								try {
									const result = await submit({ data: { warriorId } });
									setMessage(
										result.error ??
											`Portrait job: ${result.job.status}. Refresh this page to check for your portrait.`,
									);
									await router.invalidate({ sync: true });
								} catch {
									setMessage(
										"Could not confirm portrait submission. Refresh this page before trying again; a job may already exist.",
									);
								} finally {
									setSubmitting(false);
								}
							}}
						>
							{submitting ? "Submitting…" : "Generate portrait"}
						</Button>
					</>
				)}
				{message && !job && <output className="block">{message}</output>}
			</CardContent>
		</Card>
	);
}
