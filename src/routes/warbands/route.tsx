import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getCollections } from "@/db-collections";

export const Route = createFileRoute("/warbands")({
	ssr: false,
	loader: async ({ context }) => {
		const { events, warbandMatches, warbands, warriors } = getCollections(
			context.dbClient,
		);
		await Promise.all([
			events.preload(),
			warbandMatches.preload(),
			warbands.preload(),
			warriors.preload(),
		]);
		return null;
	},
	component: WarbandsLayout,
});

function WarbandsLayout() {
	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
			<Outlet />
		</main>
	);
}
