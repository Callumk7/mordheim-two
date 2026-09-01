import { safeRandomUUID, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	WarriorForm,
	type WarriorFormValues,
} from "../components/warrior-form";
import { getWarbandsCollection } from "../db-collections/warbands";
import { getWarriorsCollection } from "../db-collections/warriors";

export const Route = createFileRoute("/warriors/new")({
	component: NewWarriorPage,
});

function NewWarriorPage() {
	const { queryClient } = Route.useRouteContext();
	const warriorsCollection = getWarriorsCollection(queryClient);
	const warbandsCollection = getWarbandsCollection(queryClient);
	const navigate = useNavigate({ from: Route.fullPath });
	const { data: warbands } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbandsCollection })
				.orderBy(({ warband }) => warband.name),
	});
	const initialValues: WarriorFormValues = {
		name: "",
		class: "",
		status: "Alive",
		warbandId: warbands[0]?.id ?? "",
		knocked: 0,
		injuries: 0,
		knockedDowns: 0,
	};

	return (
		<div className="mx-auto max-w-3xl">
			<Link
				className="text-sm text-stone-500 hover:text-amber-300"
				to="/warriors"
			>
				← Warriors
			</Link>
			<header className="mt-7 border-b border-stone-800 pb-6">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400">
					Recruitment
				</p>
				<h1 className="mt-2 font-serif text-4xl font-semibold text-stone-100">
					New warrior
				</h1>
				<p className="mt-2 text-stone-400">
					Add a new fighter to a campaign warband.
				</p>
			</header>

			{warbands.length ? (
				<section className="mt-7 rounded-xl border border-stone-800 bg-stone-900/40 p-6">
					<WarriorForm
						initialValues={initialValues}
						onSubmit={async (values) => {
							const id = safeRandomUUID();
							const transaction = warriorsCollection.insert({ id, ...values });
							await transaction.isPersisted.promise;
							await navigate({
								to: "/warriors/$warriorId",
								params: { warriorId: id },
							});
						}}
						submitLabel="Create warrior"
						warbands={warbands}
					/>
				</section>
			) : (
				<section className="mt-7 rounded-xl border border-dashed border-stone-700 px-6 py-12 text-center">
					<h2 className="font-serif text-2xl text-stone-100">
						A warband is required
					</h2>
					<p className="mt-2 text-stone-500">
						Create a warband before recruiting a warrior.
					</p>
					<Link
						className="mt-5 inline-flex text-amber-300 hover:text-amber-200"
						to="/warbands/new"
					>
						Create a warband →
					</Link>
				</section>
			)}
		</div>
	);
}
