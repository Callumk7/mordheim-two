import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { NotFoundPanel } from "@/components/shared/entity-chrome";
import { getCollections } from "@/db-collections";

export const Route = createFileRoute(
	"/campaigns/$campaignId/warriors/$warriorId",
)({
	loader: async ({ context, params }) => {
		const { equipment, warriorEquipment, warriors } = getCollections(
			context.dbClient,
		);
		await Promise.all([
			equipment.preload(),
			warriorEquipment.preload(),
			warriors.preload(),
		]);
		const warrior = warriors.get(params.warriorId);
		if (!warrior || warrior.campaignId !== params.campaignId) throw notFound();
		return null;
	},
	component: () => <Outlet />,
	notFoundComponent: MissingWarrior,
});

function MissingWarrior() {
	const { campaignId, warriorId } = Route.useParams();

	return (
		<NotFoundPanel
			description={<>No warrior exists with the identifier “{warriorId}”.</>}
			link={{ params: { campaignId }, to: "/campaigns/$campaignId/warriors" }}
			linkLabel="Return to warriors →"
			title="Unknown warrior"
		/>
	);
}
