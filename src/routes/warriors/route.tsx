import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Page } from "@/components/shared/page";
import { getCollections } from "@/db-collections";

export const Route = createFileRoute("/warriors")({
	ssr: false,
	loader: async ({ context }) => {
		const { events, warbands, warriors } = getCollections(context.dbClient);
		await Promise.all([
			events.preload(),
			warbands.preload(),
			warriors.preload(),
		]);
		return null;
	},
	component: WarriorsLayout,
});

function WarriorsLayout() {
	return (
		<Page>
			<Outlet />
		</Page>
	);
}
