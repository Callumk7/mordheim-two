import { useServerFn } from "@tanstack/react-start";
import { EntityImagePicker } from "@/components/shared/entity-image-picker";
import { Typography } from "@/components/shared/typography";
import { Card, CardContent } from "@/components/ui/card";
import type { EventOutcome } from "@/db/validation/event";
import {
	createEventImage,
	type getEventImage,
	selectEventImage,
} from "@/server/event-images";

export function EventImage({
	attackerName,
	defenderName,
	eventId,
	image,
	outcome,
}: {
	attackerName: string;
	defenderName: string;
	eventId: string;
	image: Awaited<ReturnType<typeof getEventImage>>;
	outcome: EventOutcome | null;
}) {
	const generate = useServerFn(createEventImage);
	const select = useServerFn(selectEventImage);
	if (outcome !== "Injury" && outcome !== "Death") return null;
	return (
		<Card className="mt-7">
			<CardContent className="space-y-4">
				<Typography variant="sectionTitle" className="text-foreground">
					Event illustration
				</Typography>
				{"error" in image ? (
					<p role="alert">{image.error}</p>
				) : (
					<EntityImagePicker
						active={image.job}
						alt={`${attackerName} inflicting ${outcome.toLowerCase()} on ${defenderName}`}
						emptyDescription="No event illustration is selected. Generated attempts remain available in image history."
						history={image.history}
						label="Event illustration"
						onGenerate={() => generate({ data: { eventId } })}
						onSelect={(jobId) => select({ data: { eventId, jobId } })}
					/>
				)}
			</CardContent>
		</Card>
	);
}
