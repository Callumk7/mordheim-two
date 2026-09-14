import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
} from "@tanstack/react-router";
import { Typography } from "@/components/shared/typography";
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
			<Typography variant="eyebrow">Not found</Typography>
			<Typography variant="pageTitle" className="mt-3 text-foreground">
				Unknown warband
			</Typography>
			<Typography variant="supportingBody" className="mt-2">
				No warband exists with the identifier “{warbandId}”.
			</Typography>
			<Link
				className="mt-6 inline-flex text-primary hover:text-primary/80"
				to="/warbands"
			>
				Return to warbands →
			</Link>
		</section>
	);
}
