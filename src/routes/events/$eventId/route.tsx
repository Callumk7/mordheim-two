import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { NotFoundPanel } from "@/components/shared/entity-chrome";
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
		<NotFoundPanel
			description={<>No event exists with the identifier “{eventId}”.</>}
			link={{ to: "/events" }}
			linkLabel="Return to events →"
			title="Unknown event"
		/>
	);
}
