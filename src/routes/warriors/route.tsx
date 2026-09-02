import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getWarbandsCollection } from "../../db-collections/warbands";
import { getWarriorsCollection } from "../../db-collections/warriors";

export const Route = createFileRoute("/warriors")({
	ssr: false,
	loader: async ({ context }) => {
		await Promise.all([
			getWarriorsCollection(context.queryClient).preload(),
			getWarbandsCollection(context.queryClient).preload(),
		]);
		return null;
	},
	component: WarriorsLayout,
});

function WarriorsLayout() {
	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
			<Outlet />
		</main>
	);
}
