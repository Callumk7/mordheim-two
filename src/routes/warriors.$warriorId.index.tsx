import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { WarriorForm } from "../components/warrior-form";
import { getWarbandsCollection } from "../db-collections/warbands";
import { getWarriorsCollection } from "../db-collections/warriors";

export const Route = createFileRoute("/warriors/$warriorId/")({
	component: WarriorDetailPage,
});

function WarriorDetailPage() {
	const { warriorId } = Route.useParams();
	const { queryClient } = Route.useRouteContext();
	const warriorsCollection = getWarriorsCollection(queryClient);
	const warbandsCollection = getWarbandsCollection(queryClient);
	const { data: warriors } = useLiveQuery({
		query: (q) =>
			q
				.from({ warrior: warriorsCollection })
				.where(({ warrior }) => eq(warrior.id, warriorId)),
	});
	const { data: warbands } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbandsCollection })
				.orderBy(({ warband }) => warband.name),
	});
	const warrior = warriors[0];
	const warband = warbands.find(
		(candidate) => candidate.id === warrior?.warbandId,
	);

	if (!warrior) return null;

	return (
		<div className="mx-auto max-w-3xl">
			<div className="flex items-center justify-between gap-4">
				<Link
					className="text-sm text-stone-500 hover:text-amber-300"
					to="/warriors"
				>
					← Warriors
				</Link>
				<Link
					className="text-sm text-rose-400/80 hover:text-rose-300"
					params={{ warriorId }}
					to="/warriors/$warriorId/delete"
				>
					Delete warrior
				</Link>
			</div>

			<header className="mt-7 border-b border-stone-800 pb-6">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400">
					{warband?.name ?? "Unknown warband"} · {warrior.class}
				</p>
				<h1 className="mt-2 font-serif text-4xl font-semibold text-stone-100">
					{warrior.name}
				</h1>
				<p className="mt-2 text-stone-400">
					Edit this warrior’s campaign record.
				</p>
			</header>

			<section className="mt-7 rounded-xl border border-stone-800 bg-stone-900/40 p-6">
				<WarriorForm
					initialValues={warrior}
					key={warrior.id}
					onSubmit={async (values) => {
						const transaction = warriorsCollection.update(
							warrior.id,
							(draft) => {
								Object.assign(draft, values);
							},
						);
						await transaction.isPersisted.promise;
					}}
					submitLabel="Save changes"
					warbands={warbands}
				/>
			</section>
		</div>
	);
}
