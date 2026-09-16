import { useServerFn } from "@tanstack/react-start";
import { EntityImagePicker } from "@/components/shared/entity-image-picker";
import { Typography } from "@/components/shared/typography";
import { Card, CardContent } from "@/components/ui/card";
import {
	createWarriorPortrait,
	type getWarriorPortrait,
	selectWarriorPortrait,
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
	const generate = useServerFn(createWarriorPortrait);
	const select = useServerFn(selectWarriorPortrait);
	return (
		<Card className="mt-7">
			<CardContent className="space-y-4">
				<Typography variant="sectionTitle" className="text-foreground">
					Portrait
				</Typography>
				{"error" in portrait ? (
					<p role="alert">{portrait.error}</p>
				) : (
					<EntityImagePicker
						active={portrait.job}
						alt={`Portrait of ${name}`}
						emptyDescription="No portrait is selected. Generation uses the currently saved profile details."
						history={portrait.history ?? []}
						label="Portrait"
						onGenerate={() => generate({ data: { warriorId } })}
						onSelect={(jobId) => select({ data: { warriorId, jobId } })}
					/>
				)}
			</CardContent>
		</Card>
	);
}
