import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { WarbandForm } from "../components/warband-form";
import { getWarbandsCollection } from "../db-collections/warbands";

export const Route = createFileRoute("/warbands/$warbandId/")({
	component: WarbandDetailPage,
});

function WarbandDetailPage() {
	const { warbandId } = Route.useParams();
	const { queryClient } = Route.useRouteContext();
	const warbandsCollection = getWarbandsCollection(queryClient);
	const { data } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbandsCollection })
				.where(({ warband }) => eq(warband.id, warbandId)),
	});
	const warband = data[0];

	if (!warband) return null;

	return (
		<div className="mx-auto max-w-3xl">
			<div className="flex items-center justify-between gap-4">
				<Link
					className="text-sm text-muted-foreground hover:text-primary/80"
					to="/warbands"
				>
					← Warbands
				</Link>
				<Link
					className="text-sm text-destructive/80 hover:text-destructive"
					params={{ warbandId }}
					to="/warbands/$warbandId/delete"
				>
					Delete warband
				</Link>
			</div>

			<header className="mt-7 border-b border-border pb-6">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
					{warband.faction}
				</p>
				<h1 className="mt-2 font-serif text-4xl font-semibold text-foreground">
					{warband.name}
				</h1>
				<p className="mt-2 text-muted-foreground">
					Edit this warband’s campaign record.
				</p>
			</header>

			<section className="mt-7 rounded-xl border border-border bg-card p-6">
				<WarbandForm
					initialValues={warband}
					key={warband.id}
					onSubmit={async (values) => {
						const transaction = warbandsCollection.update(
							warband.id,
							(draft) => {
								Object.assign(draft, values);
							},
						);
						await transaction.isPersisted.promise;
					}}
					submitLabel="Save changes"
				/>
			</section>
		</div>
	);
}
