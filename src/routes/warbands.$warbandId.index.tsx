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
					className="text-sm text-stone-500 hover:text-amber-300"
					to="/warbands"
				>
					← Warbands
				</Link>
				<Link
					className="text-sm text-rose-400/80 hover:text-rose-300"
					params={{ warbandId }}
					to="/warbands/$warbandId/delete"
				>
					Delete warband
				</Link>
			</div>

			<header className="mt-7 border-b border-stone-800 pb-6">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400">
					{warband.faction}
				</p>
				<h1 className="mt-2 font-serif text-4xl font-semibold text-stone-100">
					{warband.name}
				</h1>
				<p className="mt-2 text-stone-400">
					Edit this warband’s campaign record.
				</p>
			</header>

			<section className="mt-7 rounded-xl border border-stone-800 bg-stone-900/40 p-6">
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
