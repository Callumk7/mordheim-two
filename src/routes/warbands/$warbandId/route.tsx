import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
} from "@tanstack/react-router";
import { campaignTypography } from "@/components/shared/typography";
import { getCollections } from "@/db-collections";

export const Route = createFileRoute("/warbands/$warbandId")({
	loader: async ({ context, params }) => {
		const { warbands: warbandsCollection, warriors: warriorsCollection } =
			getCollections(context.dbClient);
		await Promise.all([
			warbandsCollection.preload(),
			warriorsCollection.preload(),
		]);
		if (!warbandsCollection.get(params.warbandId)) throw notFound();
		return null;
	},
	component: () => <Outlet />,
	notFoundComponent: MissingWarband,
});

function MissingWarband() {
	const { warbandId } = Route.useParams();

	return (
		<section className="rounded-xl border border-border bg-card px-6 py-14 text-center">
			<p className={campaignTypography.eyebrow}>Not found</p>
			<h1 className={`${campaignTypography.pageTitle} mt-3 text-foreground`}>
				Unknown warband
			</h1>
			<p className={`${campaignTypography.supportingBody} mt-2`}>
				No warband exists with the identifier “{warbandId}”.
			</p>
			<Link
				className="mt-6 inline-flex text-primary hover:text-primary/80"
				to="/warbands"
			>
				Return to warbands →
			</Link>
		</section>
	);
}
