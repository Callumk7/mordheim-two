import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getMatchesCollection } from "../../db-collections/matches";

export const Route = createFileRoute("/matches")({
	ssr: false,
	loader: async ({ context }) => {
		await getMatchesCollection(context.queryClient).preload();
		return null;
	},
	component: MatchesLayout,
});

function MatchesLayout() {
	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
			<Outlet />
		</main>
	);
}
