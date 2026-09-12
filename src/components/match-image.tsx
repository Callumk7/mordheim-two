import { GeneratedImageStatus } from "@/components/shared/generated-image-status";
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
	return (
		<Card>
			<CardContent className="space-y-4">
				<h2 className="font-serif text-2xl text-foreground">
					Match illustration
				</h2>
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
