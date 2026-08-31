import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
} from "@tanstack/react-router";
import { getEventsCollection } from "../db-collections/events";

export const Route = createFileRoute("/events/$eventId")({
	loader: async ({ context, params }) => {
		const collection = getEventsCollection(context.queryClient);
		await collection.preload();
		if (!collection.get(params.eventId)) throw notFound();
		return null;
	},
	component: () => <Outlet />,
	notFoundComponent: MissingEvent,
});

function MissingEvent() {
	const { eventId } = Route.useParams();

	return (
		<section className="rounded-xl border border-stone-800 bg-stone-900/40 px-6 py-14 text-center">
			<p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400">
				Not found
			</p>
			<h1 className="mt-3 font-serif text-3xl text-stone-100">Unknown event</h1>
			<p className="mt-2 text-stone-500">
				No event exists with the identifier “{eventId}”.
			</p>
			<Link
				className="mt-6 inline-flex text-amber-300 hover:text-amber-200"
				to="/events"
			>
				Return to events →
			</Link>
		</section>
	);
}
