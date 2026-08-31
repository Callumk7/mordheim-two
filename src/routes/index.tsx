import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
			<section className="max-w-3xl">
				<p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-400">
					Campaign command
				</p>
				<h1 className="mt-5 font-serif text-5xl font-semibold leading-tight text-stone-100 sm:text-7xl">
					Keep order in the City of the Damned.
				</h1>
				<p className="mt-6 max-w-2xl text-lg leading-8 text-stone-400">
					Track warbands, captains, ratings, and recovery status from one
					durable campaign ledger.
				</p>
				<div className="mt-9 flex flex-wrap gap-3">
					<Link
						className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-stone-950 transition hover:bg-amber-300"
						to="/warbands"
					>
						Browse warbands
					</Link>
					<Link
						className="rounded-lg border border-stone-700 px-5 py-3 font-semibold text-stone-300 transition hover:border-stone-500 hover:text-stone-100"
						to="/warbands/new"
					>
						Create warband
					</Link>
				</div>
			</section>

			<section className="mt-16 grid gap-4 border-t border-stone-800 pt-8 sm:grid-cols-3">
				<Feature title="Persistent records">
					Drizzle-backed data stored in Cloudflare D1.
				</Feature>
				<Feature title="Optimistic commands">
					Fast local updates synchronized through TanStack DB.
				</Feature>
				<Feature title="Campaign-ready routes">
					Create, inspect, edit, and retire warbands.
				</Feature>
			</section>
		</main>
	);
}

function Feature({
	children,
	title,
}: {
	children: React.ReactNode;
	title: string;
}) {
	return (
		<article className="rounded-xl border border-stone-800 bg-stone-900/30 p-5">
			<h2 className="font-semibold text-stone-100">{title}</h2>
			<p className="mt-2 text-sm leading-6 text-stone-500">{children}</p>
		</article>
	);
}
