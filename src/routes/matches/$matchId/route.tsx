import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
} from "@tanstack/react-router";
import { getMatchesCollection } from "../../../db-collections/matches";

export const Route = createFileRoute("/matches/$matchId")({
	loader: async ({ context, params }) => {
		const collection = getMatchesCollection(context.queryClient);
		await collection.preload();
		if (!collection.get(params.matchId)) throw notFound();
		return null;
	},
	component: () => <Outlet />,
	notFoundComponent: MissingMatch,
});

function MissingMatch() {
	const { matchId } = Route.useParams();

	return (
		<section className="rounded-xl border border-border bg-card px-6 py-14 text-center">
			<p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
				Not found
			</p>
			<h1 className="mt-3 font-serif text-3xl text-foreground">
				Unknown match
			</h1>
			<p className="mt-2 text-muted-foreground">
				No match exists with the identifier “{matchId}”.
			</p>
			<Link
				className="mt-6 inline-flex text-primary hover:text-primary/80"
				to="/matches"
			>
				Return to matches →
			</Link>
		</section>
	);
}
