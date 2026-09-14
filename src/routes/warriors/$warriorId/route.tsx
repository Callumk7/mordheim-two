import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
} from "@tanstack/react-router";
import { campaignTypography } from "@/components/shared/typography";
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
		<section className="rounded-xl border border-border bg-card px-6 py-14 text-center">
			<p className={campaignTypography.eyebrow}>Not found</p>
			<h1 className={`${campaignTypography.pageTitle} mt-3 text-foreground`}>
				Unknown warrior
			</h1>
			<p className={`${campaignTypography.supportingBody} mt-2`}>
				No warrior exists with the identifier “{warriorId}”.
			</p>
			<Link
				className="mt-6 inline-flex text-primary hover:text-primary/80"
				to="/warriors"
			>
				Return to warriors →
			</Link>
		</section>
	);
}
