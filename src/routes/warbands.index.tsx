import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getWarbandsCollection } from "../db-collections/warbands";

export const Route = createFileRoute("/warbands/")({
	component: WarbandsIndexPage,
});

function WarbandsIndexPage() {
	const { queryClient } = Route.useRouteContext();
	const warbandsCollection = getWarbandsCollection(queryClient);
	const { data: warbands } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbandsCollection })
				.orderBy(({ warband }) => warband.name, "asc"),
	});

	return (
		<div className="grid gap-8">
			<header className="flex flex-col justify-between gap-5 border-b border-stone-800 pb-7 sm:flex-row sm:items-end">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400">
						Campaign records
					</p>
					<h1 className="mt-2 font-serif text-4xl font-semibold text-stone-100 sm:text-5xl">
						Warbands
					</h1>
					<p className="mt-2 text-stone-400">
						Manage every company fighting through the City of the Damned.
					</p>
				</div>
				<Link
					className="inline-flex w-fit rounded-lg bg-amber-400 px-4 py-2.5 font-semibold text-stone-950 transition hover:bg-amber-300"
					to="/warbands/new"
				>
					New warband
				</Link>
			</header>

			{warbands.length ? (
				<div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-950/60">
					<div className="overflow-x-auto">
						<table className="w-full min-w-[720px] border-collapse text-left text-sm">
							<thead className="border-b border-stone-800 bg-stone-900/70 text-xs uppercase tracking-wider text-stone-500">
								<tr>
									<th className="px-5 py-3.5 font-medium">Warband</th>
									<th className="px-5 py-3.5 font-medium">Captain</th>
									<th className="px-5 py-3.5 font-medium">Status</th>
									<th className="px-5 py-3.5 font-medium">Rating</th>
									<th className="px-5 py-3.5 text-right font-medium">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-stone-800/80">
								{warbands.map((warband) => (
									<tr
										className="transition hover:bg-stone-900/60"
										key={warband.id}
									>
										<td className="px-5 py-4">
											<Link
												className="font-semibold text-stone-100 hover:text-amber-300"
												params={{ warbandId: warband.id }}
												to="/warbands/$warbandId"
											>
												{warband.name}
											</Link>
											<div className="mt-1 text-xs text-stone-500">
												{warband.faction}
											</div>
										</td>
										<td className="px-5 py-4 text-stone-300">
											{warband.captain}
										</td>
										<td className="px-5 py-4 text-stone-300">
											{warband.status}
										</td>
										<td className="px-5 py-4 font-mono text-amber-300">
											{warband.rating}
										</td>
										<td className="px-5 py-4">
											<div className="flex justify-end gap-3">
												<Link
													className="text-stone-400 hover:text-stone-100"
													params={{ warbandId: warband.id }}
													to="/warbands/$warbandId"
												>
													View
												</Link>
												<Link
													className="text-rose-400/80 hover:text-rose-300"
													params={{ warbandId: warband.id }}
													to="/warbands/$warbandId/delete"
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
					<h2 className="font-serif text-2xl text-stone-100">
						No warbands yet
					</h2>
					<p className="mt-2 text-stone-500">
						Create the first company in this campaign.
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
