import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Cell,
	Column,
	Row,
	TableBody,
	TableHeader,
} from "react-aria-components";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
	IndexTable,
} from "../components/index-page";
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
		<IndexPage>
			<IndexPageHeader
				action={<Link to="/warbands/new">New warband</Link>}
				description="Manage every company fighting through the City of the Damned."
				eyebrow="Campaign records"
				title="Warbands"
			/>

			{warbands.length ? (
				<IndexTable aria-label="Warbands" minWidth={720}>
					<TableHeader>
						<Column isRowHeader>Warband</Column>
						<Column>Captain</Column>
						<Column>Status</Column>
						<Column>Rating</Column>
						<Column className="text-right">Actions</Column>
					</TableHeader>
					<TableBody>
						{warbands.map((warband) => (
							<Row key={warband.id}>
								<Cell className="text-stone-300 [&_a]:font-semibold [&_a]:text-stone-100 [&_a:hover]:text-amber-300">
									<Link
										params={{ warbandId: warband.id }}
										to="/warbands/$warbandId"
									>
										{warband.name}
									</Link>
									<div className="mt-1 text-xs text-stone-500">
										{warband.faction}
									</div>
								</Cell>
								<Cell className="text-stone-300">{warband.captain}</Cell>
								<Cell className="text-stone-300">{warband.status}</Cell>
								<Cell className="font-mono text-amber-300">
									{warband.rating}
								</Cell>
								<Cell className="text-stone-300">
									<div className="flex justify-end gap-3 [&_a]:text-stone-400 [&_a:hover]:text-stone-100 [&_a[data-danger]]:text-rose-400/80 [&_a[data-danger]:hover]:text-rose-300">
										<Link
											params={{ warbandId: warband.id }}
											to="/warbands/$warbandId"
										>
											View
										</Link>
										<Link
											data-danger
											params={{ warbandId: warband.id }}
											to="/warbands/$warbandId/delete"
										>
											Delete
										</Link>
									</div>
								</Cell>
							</Row>
						))}
					</TableBody>
				</IndexTable>
			) : (
				<IndexEmptyState
					action={<Link to="/warbands/new">Create a warband →</Link>}
					description="Create the first company in this campaign."
					title="No warbands yet"
				/>
			)}
		</IndexPage>
	);
}
