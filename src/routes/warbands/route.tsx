import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getWarbandsCollection } from "../../db-collections/warbands";

export const Route = createFileRoute("/warbands")({
	ssr: false,
	loader: async ({ context }) => {
		await getWarbandsCollection(context.queryClient).preload();
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
