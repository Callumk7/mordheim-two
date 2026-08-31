import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getEventsCollection } from "../db-collections/events";
import { getMatchesCollection } from "../db-collections/matches";
import { getWarbandsCollection } from "../db-collections/warbands";

export const Route = createFileRoute("/events/")({
	component: EventsIndexPage,
});

function EventsIndexPage() {
	const { queryClient } = Route.useRouteContext();
	const eventsCollection = getEventsCollection(queryClient);
	const matchesCollection = getMatchesCollection(queryClient);
	const warbandsCollection = getWarbandsCollection(queryClient);
	const { data: events } = useLiveQuery({
		query: (q) =>
			q
				.from({ event: eventsCollection })
				.orderBy(({ event }) => event.createdAt, "desc"),
	});
	const { data: matches } = useLiveQuery({
		query: (q) => q.from({ match: matchesCollection }),
	});
	const { data: warbands } = useLiveQuery({
		query: (q) => q.from({ warband: warbandsCollection }),
	});
	const matchNames = new Map(matches.map((match) => [match.id, match.name]));
	const warbandNames = new Map(
		warbands.map((warband) => [warband.id, warband.name]),
	);

	return (
		<div className="grid gap-8">
			<header className="flex flex-col justify-between gap-5 border-b border-stone-800 pb-7 sm:flex-row sm:items-end">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400">
						Campaign action
					</p>
					<h1 className="mt-2 font-serif text-4xl font-semibold text-stone-100 sm:text-5xl">
						Events
					</h1>
					<p className="mt-2 text-stone-400">
						Record knock downs as they happen during each match.
					</p>
				</div>
				<Link
					className="inline-flex w-fit rounded-lg bg-amber-400 px-4 py-2.5 font-semibold text-stone-950 transition hover:bg-amber-300"
					to="/events/new"
				>
					New event
				</Link>
			</header>

			{events.length ? (
				<div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-950/60">
					<div className="overflow-x-auto">
						<table className="w-full min-w-[760px] border-collapse text-left text-sm">
							<thead className="border-b border-stone-800 bg-stone-900/70 text-xs uppercase tracking-wider text-stone-500">
								<tr>
									<th className="px-5 py-3.5 font-medium">Match</th>
									<th className="px-5 py-3.5 font-medium">Attacker</th>
									<th className="px-5 py-3.5 font-medium">Defender</th>
									<th className="px-5 py-3.5 font-medium">Notes</th>
									<th className="px-5 py-3.5 text-right font-medium">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-stone-800/80">
								{events.map((event) => (
									<tr
										className="transition hover:bg-stone-900/60"
										key={event.id}
									>
										<td className="px-5 py-4">
											<Link
												className="font-semibold text-stone-100 hover:text-amber-300"
												params={{ eventId: event.id }}
												to="/events/$eventId"
											>
												{matchNames.get(event.matchId) ?? "Unknown match"}
											</Link>
										</td>
										<td className="px-5 py-4 text-stone-300">
											{warbandNames.get(event.attackerWarbandId) ??
												"Unknown warband"}
										</td>
										<td className="px-5 py-4 text-stone-300">
											{warbandNames.get(event.defenderWarbandId) ??
												"Unknown warband"}
										</td>
										<td className="max-w-64 truncate px-5 py-4 text-stone-400">
											{event.notes || "—"}
										</td>
										<td className="px-5 py-4">
											<div className="flex justify-end gap-3">
												<Link
													className="text-stone-400 hover:text-stone-100"
													params={{ eventId: event.id }}
													to="/events/$eventId"
												>
													View
												</Link>
												<Link
													className="text-rose-400/80 hover:text-rose-300"
													params={{ eventId: event.id }}
													to="/events/$eventId/delete"
												>
													Delete
												</Link>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			) : (
				<section className="rounded-xl border border-dashed border-stone-700 px-6 py-16 text-center">
					<h2 className="font-serif text-2xl text-stone-100">No events yet</h2>
					<p className="mt-2 text-stone-500">
						Record the campaign’s first knock down.
					</p>
					<Link
						className="mt-5 inline-flex text-amber-300 hover:text-amber-200"
						to="/events/new"
					>
						Create an event →
					</Link>
				</section>
			)}
		</div>
	);
}
