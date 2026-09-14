import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
} from "@tanstack/react-router";
import { campaignTypography } from "@/components/shared/typography";
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
			<p className={campaignTypography.eyebrow}>Not found</p>
			<h1 className={`${campaignTypography.pageTitle} mt-3 text-foreground`}>
				Unknown event
			</h1>
			<p className={`${campaignTypography.supportingBody} mt-2`}>
				No event exists with the identifier “{eventId}”.
			</p>
			<Link
				className="mt-6 inline-flex text-primary hover:text-primary/80"
				to="/events"
			>
				Return to events →
			</Link>
		</section>
	);
}
