import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<div className="p-8">
			<h1 className="text-4xl font-bold">Welcome to TanStack Start</h1>
			<p className="mt-4 text-lg">
				Explore the interactive TanStack DB and TanStack Table integration.
			</p>
			<Link
				className="mt-6 inline-flex rounded-lg bg-stone-900 px-4 py-2.5 font-semibold text-white transition hover:bg-amber-600"
				to="/demo"
			>
				Open the warband registry →
			</Link>
		</div>
	);
}
