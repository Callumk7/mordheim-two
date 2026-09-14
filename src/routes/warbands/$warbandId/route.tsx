import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { NotFoundPanel } from "@/components/shared/entity-chrome";
import { getCollections } from "@/db-collections";

export const Route = createFileRoute("/warbands/$warbandId")({
	loader: async ({ context, params }) => {
		const { warbands: warbandsCollection, warriors: warriorsCollection } =
			getCollections(context.dbClient);
		await Promise.all([
			warbandsCollection.preload(),
			warriorsCollection.preload(),
		]);
		if (!warbandsCollection.get(params.warbandId)) throw notFound();
		return null;
	},
	component: () => <Outlet />,
	notFoundComponent: MissingWarband,
});

function MissingWarband() {
	const { warbandId } = Route.useParams();

	return (
		<NotFoundPanel
			description={<>No warband exists with the identifier “{warbandId}”.</>}
			link={{ to: "/warbands" }}
			linkLabel="Return to warbands →"
			title="Unknown warband"
		/>
	);
}
