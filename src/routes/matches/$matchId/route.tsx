import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
} from "@tanstack/react-router";
import { campaignTypography } from "@/components/shared/typography";
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
			<p className={campaignTypography.eyebrow}>Not found</p>
			<h1 className={`${campaignTypography.pageTitle} mt-3 text-foreground`}>
				Unknown match
			</h1>
			<p className={`${campaignTypography.supportingBody} mt-2`}>
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
