import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/shared/page";
import { Typography } from "@/components/shared/typography";

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
					<Link
						className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90"
						to="/warbands"
					>
						Browse warbands
					</Link>
					<Link
						className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90"
						to="/warriors"
					>
						Browse warriors
					</Link>
					<Link
						className="rounded-lg border border-input px-5 py-3 font-semibold text-foreground transition hover:border-ring hover:text-foreground"
						to="/matches"
					>
						Browse matches
					</Link>
					<Link
						className="rounded-lg border border-input px-5 py-3 font-semibold text-foreground transition hover:border-ring hover:text-foreground"
						to="/events"
					>
						Browse events
					</Link>
				</div>
			</section>
		</Page>
	);
}
