import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { formatStatus } from "../components/match-form";
import { getMatchesCollection } from "../db-collections/matches";

export const Route = createFileRoute("/matches/")({
	component: MatchesIndexPage,
});

function MatchesIndexPage() {
	const { queryClient } = Route.useRouteContext();
	const matchesCollection = getMatchesCollection(queryClient);
	const { data: matches } = useLiveQuery({
		query: (q) =>
			q
				.from({ match: matchesCollection })
				.orderBy(({ match }) => match.createdAt, "desc"),
	});

	return (
		<div className="grid gap-8">
			<header className="flex flex-col justify-between gap-5 border-b border-stone-800 pb-7 sm:flex-row sm:items-end">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400">
						Campaign encounters
					</p>
					<h1 className="mt-2 font-serif text-4xl font-semibold text-stone-100 sm:text-5xl">
						Matches
					</h1>
					<p className="mt-2 text-stone-400">
						Schedule scenarios and track each encounter through completion.
					</p>
				</div>
				<Link
					className="inline-flex w-fit rounded-lg bg-amber-400 px-4 py-2.5 font-semibold text-stone-950 transition hover:bg-amber-300"
					to="/matches/new"
				>
					New match
				</Link>
			</header>

			{matches.length ? (
				<div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-950/60">
					<div className="overflow-x-auto">
						<table className="w-full min-w-[640px] border-collapse text-left text-sm">
							<thead className="border-b border-stone-800 bg-stone-900/70 text-xs uppercase tracking-wider text-stone-500">
								<tr>
									<th className="px-5 py-3.5 font-medium">Match</th>
									<th className="px-5 py-3.5 font-medium">Scenario</th>
									<th className="px-5 py-3.5 font-medium">Status</th>
									<th className="px-5 py-3.5 text-right font-medium">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-stone-800/80">
								{matches.map((match) => (
									<tr
										className="transition hover:bg-stone-900/60"
										key={match.id}
									>
										<td className="px-5 py-4">
											<Link
												className="font-semibold text-stone-100 hover:text-amber-300"
												params={{ matchId: match.id }}
												to="/matches/$matchId"
											>
												{match.name}
											</Link>
										</td>
										<td className="px-5 py-4 text-stone-300">
											{match.scenario}
										</td>
										<td className="px-5 py-4 text-stone-300">
											{formatStatus(match.status)}
										</td>
										<td className="px-5 py-4">
											<div className="flex justify-end gap-3">
												<Link
													className="text-stone-400 hover:text-stone-100"
													params={{ matchId: match.id }}
													to="/matches/$matchId"
												>
													View
												</Link>
												<Link
													className="text-rose-400/80 hover:text-rose-300"
													params={{ matchId: match.id }}
													to="/matches/$matchId/delete"
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
					<h2 className="font-serif text-2xl text-stone-100">No matches yet</h2>
					<p className="mt-2 text-stone-500">
						Schedule the campaign’s first encounter.
					</p>
					<Link
						className="mt-5 inline-flex text-amber-300 hover:text-amber-200"
						to="/matches/new"
					>
						Create a match →
					</Link>
				</section>
			)}
		</div>
	);
}
