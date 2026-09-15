import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { NotFoundPanel } from "@/components/shared/entity-chrome";
import { getCollections } from "@/db-collections";

export const Route = createFileRoute("/matches/$matchId")({
	loader: async ({ context, params }) => {
		const { matches: collection } = getCollections(context.dbClient);
		await collection.preload();
		if (!collection.get(params.matchId)) throw notFound();
		return null;
	},
	component: () => <Outlet />,
	notFoundComponent: MissingMatch,
});

function MissingMatch() {
	const { matchId } = Route.useParams();

	return (
		<NotFoundPanel
			description={<>No match exists with the identifier “{matchId}”.</>}
			link={{ to: "/matches" }}
			linkLabel="Return to matches →"
			title="Unknown match"
		/>
	);
}
