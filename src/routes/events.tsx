import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getEventsCollection } from "../db-collections/events";
import { getMatchesCollection } from "../db-collections/matches";
import { getWarbandsCollection } from "../db-collections/warbands";

export const Route = createFileRoute("/events")({
	ssr: false,
	loader: async ({ context }) => {
		await Promise.all([
			getEventsCollection(context.queryClient).preload(),
			getMatchesCollection(context.queryClient).preload(),
			getWarbandsCollection(context.queryClient).preload(),
		]);
		return null;
	},
	component: EventsLayout,
});

function EventsLayout() {
	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
			<Outlet />
		</main>
	);
}
