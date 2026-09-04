import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
			<section className="max-w-3xl">
				<h1 className="mt-5 font-mordheim text-5xl text-foreground sm:text-7xl">
					Keep order in the City of the Damned.
				</h1>
				<p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
					Track warbands, matches, and the knock downs that shape each campaign
					encounter.
				</p>
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
		</main>
	);
}
