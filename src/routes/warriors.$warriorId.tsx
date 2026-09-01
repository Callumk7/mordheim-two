import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
} from "@tanstack/react-router";
import { getWarriorsCollection } from "../db-collections/warriors";

export const Route = createFileRoute("/warriors/$warriorId")({
	loader: async ({ context, params }) => {
		const collection = getWarriorsCollection(context.queryClient);
		await collection.preload();
		if (!collection.get(params.warriorId)) throw notFound();
		return null;
	},
	component: () => <Outlet />,
	notFoundComponent: MissingWarrior,
});

function MissingWarrior() {
	const { warriorId } = Route.useParams();

	return (
		<section className="rounded-xl border border-stone-800 bg-stone-900/40 px-6 py-14 text-center">
			<p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400">
				Not found
			</p>
			<h1 className="mt-3 font-serif text-3xl text-stone-100">
				Unknown warrior
			</h1>
			<p className="mt-2 text-stone-500">
				No warrior exists with the identifier “{warriorId}”.
			</p>
			<Link
				className="mt-6 inline-flex text-amber-300 hover:text-amber-200"
				to="/warriors"
			>
				Return to warriors →
			</Link>
		</section>
	);
}
