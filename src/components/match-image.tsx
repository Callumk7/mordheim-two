import {
	type GeneratedImageJob,
	GeneratedImageStatus,
} from "@/components/shared/generated-image-status";
import { isActiveImageJobStatus } from "@/components/shared/use-image-generation-polling";
import { Card, CardContent } from "@/components/ui/card";
import type { Match } from "@/db/validation/match";
import type { getMatchImagery } from "@/server/match-images";

export function MatchImage({
	imagery,
	match,
	winnerName,
}: {
	imagery: Awaited<ReturnType<typeof getMatchImagery>>;
	match: Match;
	winnerName: string;
}) {
	const isCompletedVictory =
		match.status === "Completed" &&
		match.result === "Victory" &&
		match.winnerWarbandId !== null;
	if (!isCompletedVictory) return null;

	const job = "error" in imagery ? null : imagery.match;
	const jobs =
		"error" in imagery
			? []
			: [imagery.match, ...Object.values(imagery.events)].filter(
					(candidate): candidate is GeneratedImageJob => candidate !== null,
				);
	return (
		<Card>
			<CardContent className="space-y-4">
				<h2 className="font-serif text-2xl text-foreground">
					Match illustration
				</h2>
				{jobs.length > 1 ? <ImageGroupStatus jobs={jobs} /> : null}
				{"error" in imagery ? (
					<p role="alert">{imagery.error}</p>
				) : job ? (
					<GeneratedImageStatus
						alt={`${winnerName} victorious in ${match.name}`}
						job={job}
						label="Match illustration"
					/>
				) : (
					<p className="text-sm text-muted-foreground">
						No image job is associated with this match yet. The result was
						saved, but image submission may not have completed. Re-saving the
						result from the completion dialog submits it again.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

function ImageGroupStatus({ jobs }: { jobs: readonly GeneratedImageJob[] }) {
	const message = getImageGroupStatus(jobs);

	return (
		<p aria-live="polite" className="text-sm text-muted-foreground">
			{message}
		</p>
	);
}

export function getImageGroupStatus(jobs: readonly GeneratedImageJob[]) {
	const completed = jobs.filter((job) => job.status === "completed").length;
	const active = jobs.filter((job) =>
		isActiveImageJobStatus(job.status),
	).length;
	const failed = jobs.length - completed - active;
	let message: string;

	if (completed === jobs.length) {
		message = `All ${jobs.length} illustrations are ready.`;
	} else if (active === jobs.length) {
		message = `${active} illustrations are still generating.`;
	} else if (failed === jobs.length) {
		message = `${failed} illustrations could not be generated.`;
	} else {
		const parts = [];
		if (completed > 0) {
			parts.push(
				`${completed} of ${jobs.length} illustrations ${completed === 1 ? "is" : "are"} ready`,
			);
		}
		if (active > 0) parts.push(`${active} still generating`);
		if (failed > 0) parts.push(`${failed} could not be generated`);
		message = `${parts.join("; ")}.`;
	}

	return message;
}
