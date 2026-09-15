import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { NotFoundPanel } from "@/components/shared/entity-chrome";
import { getCollections } from "@/db-collections";

export const Route = createFileRoute("/campaigns/$campaignId/matches/$matchId")(
	{
		loader: async ({ context, params }) => {
			const { matches: collection } = getCollections(context.dbClient);
			await collection.preload();
			const match = collection.get(params.matchId);
			if (!match || match.campaignId !== params.campaignId) throw notFound();
			return null;
		},
		component: () => <Outlet />,
		notFoundComponent: MissingMatch,
	},
);

function MissingMatch() {
	const { campaignId, matchId } = Route.useParams();

	return (
		<NotFoundPanel
			description={<>No match exists with the identifier “{matchId}”.</>}
			link={{ params: { campaignId }, to: "/campaigns/$campaignId/matches" }}
			linkLabel="Return to matches →"
			title="Unknown match"
		/>
	);
}
