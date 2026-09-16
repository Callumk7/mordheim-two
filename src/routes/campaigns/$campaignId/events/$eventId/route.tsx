import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { NotFoundPanel } from "@/components/shared/entity-chrome";
import { getCollections } from "@/db-collections";

export const Route = createFileRoute("/campaigns/$campaignId/events/$eventId")({
	loader: async ({ context, params }) => {
		const { events: collection } = getCollections(context.dbClient);
		await collection.preload();
		const event = collection.get(params.eventId);
		if (!event || event.campaignId !== params.campaignId) throw notFound();
		return null;
	},
	component: () => <Outlet />,
	notFoundComponent: MissingEvent,
});

function MissingEvent() {
	const { campaignId, eventId } = Route.useParams();

	return (
		<NotFoundPanel
			description={<>No event exists with the identifier “{eventId}”.</>}
			link={{ params: { campaignId }, to: "/campaigns/$campaignId/events" }}
			linkLabel="Return to events →"
			title="Unknown event"
		/>
	);
}
