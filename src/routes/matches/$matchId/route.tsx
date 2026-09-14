import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
} from "@tanstack/react-router";
import { Typography } from "@/components/shared/typography";
import { getCollections } from "@/db-collections";

export const Route = createFileRoute("/matches/$matchId")({
	loader: async ({ context, params }) => {
		const { matches: collection } = getCollections(context.dbClient);
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
			<Typography variant="eyebrow">Not found</Typography>
			<Typography variant="pageTitle" className="mt-3 text-foreground">
				Unknown match
			</Typography>
			<Typography variant="supportingBody" className="mt-2">
				No match exists with the identifier “{matchId}”.
			</Typography>
			<Link
				className="mt-6 inline-flex text-primary hover:text-primary/80"
				to="/matches"
			>
				Return to matches →
			</Link>
		</section>
	);
}
