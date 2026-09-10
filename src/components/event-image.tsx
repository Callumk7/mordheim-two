import { GeneratedImageStatus } from "@/components/shared/generated-image-status";
import { Card, CardContent } from "@/components/ui/card";
import type { EventOutcome } from "@/db/validation/event";
import type { getEventImage } from "@/server/event-images";

export function EventImage({
	attackerName,
	defenderName,
	image,
	outcome,
}: {
	attackerName: string;
	defenderName: string;
	image: Awaited<ReturnType<typeof getEventImage>>;
	outcome: EventOutcome | null;
}) {
	if (outcome !== "Injury" && outcome !== "Death") return null;
	return (
		<Card className="mt-7">
			<CardContent className="space-y-4">
				<h2 className="font-serif text-2xl text-foreground">
					Event illustration
				</h2>
				{image.error ? (
					<p role="alert">{image.error}</p>
				) : image.job ? (
					<GeneratedImageStatus
						alt={`${attackerName} inflicting ${outcome.toLowerCase()} on ${defenderName}`}
						job={image.job}
						label="Event illustration"
					/>
				) : (
					<p className="text-sm text-muted-foreground">
						No image job is associated with this event. The resolution was
						saved, but image submission may not have completed.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
