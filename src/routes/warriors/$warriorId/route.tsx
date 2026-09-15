import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { NotFoundPanel } from "@/components/shared/entity-chrome";
import { getCollections } from "@/db-collections";

export const Route = createFileRoute("/warriors/$warriorId")({
	loader: async ({ context, params }) => {
		const { equipment, warriorEquipment, warriors } = getCollections(
			context.dbClient,
		);
		await Promise.all([
			equipment.preload(),
			warriorEquipment.preload(),
			warriors.preload(),
		]);
		if (!warriors.get(params.warriorId)) throw notFound();
		return null;
	},
	component: () => <Outlet />,
	notFoundComponent: MissingWarrior,
});

function MissingWarrior() {
	const { warriorId } = Route.useParams();

	return (
		<NotFoundPanel
			description={<>No warrior exists with the identifier “{warriorId}”.</>}
			link={{ to: "/warriors" }}
			linkLabel="Return to warriors →"
			title="Unknown warrior"
		/>
	);
}
