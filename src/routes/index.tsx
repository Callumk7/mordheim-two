import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/shared/page";
import { Typography } from "@/components/shared/typography";
import { LinkButton } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<Page padding="loose">
			<section className="max-w-3xl">
				<Typography variant="display" className="mt-5 text-foreground">
					Keep order in the City of the Damned.
				</Typography>
				<Typography
					variant="displayBody"
					className="mt-6 max-w-2xl text-muted-foreground"
				>
					Track warbands, matches, and the knock downs that shape each campaign
					encounter.
				</Typography>
				<div className="mt-9 flex flex-wrap gap-3">
					<LinkButton to="/warbands">Browse warbands</LinkButton>
					<LinkButton to="/warriors">Browse warriors</LinkButton>
					<LinkButton to="/matches" variant="outline">
						Browse matches
					</LinkButton>
					<LinkButton to="/events" variant="outline">
						Browse events
					</LinkButton>
				</div>
			</section>
		</Page>
	);
}
