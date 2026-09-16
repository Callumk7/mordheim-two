import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { NotFoundPanel } from "@/components/shared/entity-chrome";
import { getCollections } from "@/db-collections";

export const Route = createFileRoute(
	"/campaigns/$campaignId/warbands/$warbandId",
)({
	loader: async ({ context, params }) => {
		const { warbands: warbandsCollection, warriors: warriorsCollection } =
			getCollections(context.dbClient);
		await Promise.all([
			warbandsCollection.preload(),
			warriorsCollection.preload(),
		]);
		const warband = warbandsCollection.get(params.warbandId);
		if (!warband || warband.campaignId !== params.campaignId) throw notFound();
		return null;
	},
	component: () => <Outlet />,
	notFoundComponent: MissingWarband,
});

function MissingWarband() {
	const { campaignId, warbandId } = Route.useParams();

	return (
		<NotFoundPanel
			description={<>No warband exists with the identifier “{warbandId}”.</>}
			link={{ params: { campaignId }, to: "/campaigns/$campaignId/warbands" }}
			linkLabel="Return to warbands →"
			title="Unknown warband"
		/>
	);
}
