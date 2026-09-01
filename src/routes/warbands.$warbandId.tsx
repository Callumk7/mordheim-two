import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
} from "@tanstack/react-router";
import { getWarbandsCollection } from "../db-collections/warbands";

export const Route = createFileRoute("/warbands/$warbandId")({
	loader: async ({ context, params }) => {
		const collection = getWarbandsCollection(context.queryClient);
		await collection.preload();
		if (!collection.get(params.warbandId)) throw notFound();
		return null;
	},
	component: () => <Outlet />,
	notFoundComponent: MissingWarband,
});

function MissingWarband() {
	const { warbandId } = Route.useParams();

	return (
		<section className="rounded-xl border border-border bg-card px-6 py-14 text-center">
			<p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
				Not found
			</p>
			<h1 className="mt-3 font-serif text-3xl text-foreground">
				Unknown warband
			</h1>
			<p className="mt-2 text-muted-foreground">
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
