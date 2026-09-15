import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Page } from "@/components/shared/page";
import { getCollections } from "@/db-collections";

export const Route = createFileRoute("/campaigns/$campaignId/events")({
	ssr: false,
	loader: async ({ context }) => {
		const { events, matches, warbandMatches, warbands, warriors } =
			getCollections(context.dbClient);
		await Promise.all([
			events.preload(),
			matches.preload(),
			warbandMatches.preload(),
			warbands.preload(),
			warriors.preload(),
		]);
		return null;
	},
	component: EventsLayout,
});

function EventsLayout() {
	return (
		<Page>
			<Outlet />
		</Page>
	);
}
