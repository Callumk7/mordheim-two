import { Typography } from "@/components/shared/typography";

export function SectionHeading({
	description,
	eyebrow,
	id,
	title,
}: {
	description: string;
	eyebrow: string;
	id: string;
	title: string;
}) {
	return (
		<div>
			<Typography variant="eyebrow">{eyebrow}</Typography>
			<Typography
				variant="sectionTitle"
				className="mt-2 text-foreground"
				id={id}
			>
				{title}
			</Typography>
			<Typography variant="supportingBody" className="mt-1">
				{description}
			</Typography>
		</div>
	);
}
