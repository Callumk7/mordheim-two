import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
	type GeneratedImageJob,
	GeneratedImageStatus,
} from "@/components/shared/generated-image-status";
import { Typography } from "@/components/shared/typography";
import { Button } from "@/components/ui/button";
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
	const [submittedJob, setSubmittedJob] = useState<GeneratedImageJob | null>(
		null,
	);
	const job = portrait.job ?? submittedJob;
	return (
		<Card className="mt-7">
			<CardContent className="space-y-4">
				<Typography variant="sectionTitle" className="text-foreground">
					Portrait
				</Typography>
				{portrait.error ? (
					<p role="alert">{portrait.error}</p>
				) : job ? (
					<GeneratedImageStatus
						alt={`Portrait of ${name}`}
						job={job}
						label="Portrait"
					/>
				) : (
					<>
						<p className="text-sm text-muted-foreground">
							Uses saved profile details. Save changes before generating.
						</p>
						<Button
							isDisabled={submitting}
							onPress={async () => {
								setSubmitting(true);
								setMessage(null);
								try {
									const result = await submit({ data: { warriorId } });
									if (result.error) {
										setMessage(result.error);
										return;
									}
									setSubmittedJob({ ...result.job, error: null });
									await router.invalidate({ sync: true });
								} catch {
									setMessage(
										"Could not confirm portrait submission. Wait a moment before trying again; a job may already exist.",
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
				{message && !job && <p role="alert">{message}</p>}
			</CardContent>
		</Card>
	);
}
