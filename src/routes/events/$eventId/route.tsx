import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
} from "@tanstack/react-router";
import { Typography } from "@/components/shared/typography";
import { getCollections } from "@/db-collections";

export const Route = createFileRoute("/events/$eventId")({
	loader: async ({ context, params }) => {
		const { events: collection } = getCollections(context.dbClient);
		await collection.preload();
		if (!collection.get(params.eventId)) throw notFound();
		return null;
	},
	component: () => <Outlet />,
	notFoundComponent: MissingEvent,
});

function MissingEvent() {
	const { eventId } = Route.useParams();

	return (
		<section className="rounded-xl border border-border bg-card px-6 py-14 text-center">
			<Typography variant="eyebrow">Not found</Typography>
			<Typography variant="pageTitle" className="mt-3 text-foreground">
				Unknown event
			</Typography>
			<Typography variant="supportingBody" className="mt-2">
				No event exists with the identifier “{eventId}”.
			</Typography>
			<Link
				className="mt-6 inline-flex text-primary hover:text-primary/80"
				to="/events"
			>
				Return to events →
			</Link>
		</section>
	);
}
