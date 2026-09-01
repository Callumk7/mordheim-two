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
import { getWarriorsCollection } from "../db-collections/warriors";

export const Route = createFileRoute("/warriors/")({
	component: WarriorsIndexPage,
});

function WarriorsIndexPage() {
	const { queryClient } = Route.useRouteContext();
	const warriorsCollection = getWarriorsCollection(queryClient);
	const warbandsCollection = getWarbandsCollection(queryClient);
	const { data: warriors } = useLiveQuery({
		query: (q) =>
			q
				.from({ warrior: warriorsCollection })
				.orderBy(({ warrior }) => warrior.name, "asc"),
	});
	const { data: warbands } = useLiveQuery({
		query: (q) => q.from({ warband: warbandsCollection }),
	});
	const warbandNames = new Map(
		warbands.map((warband) => [warband.id, warband.name]),
	);

	return (
		<IndexPage>
			<IndexPageHeader
				action={<Link to="/warriors/new">New warrior</Link>}
				description="Manage every fighter serving in the campaign’s warbands."
				eyebrow="Campaign roster"
				title="Warriors"
			/>

			{warriors.length ? (
				<IndexTable aria-label="Warriors" minWidth={760}>
					<TableHeader>
						<Column isRowHeader>Warrior</Column>
						<Column>Warband</Column>
						<Column>Status</Column>
						<Column>Injuries</Column>
						<Column>Knock downs</Column>
						<Column className="text-right">Actions</Column>
					</TableHeader>
					<TableBody>
						{warriors.map((warrior) => (
							<Row key={warrior.id}>
								<Cell className="text-stone-300 [&_a]:font-semibold [&_a]:text-stone-100 [&_a:hover]:text-amber-300">
									<Link
										params={{ warriorId: warrior.id }}
										to="/warriors/$warriorId"
									>
										{warrior.name}
									</Link>
									<div className="mt-1 text-xs text-stone-500">
										{warrior.class}
									</div>
								</Cell>
								<Cell className="text-stone-300">
									{warbandNames.get(warrior.warbandId) ?? "Unknown warband"}
								</Cell>
								<Cell className="text-stone-300">{warrior.status}</Cell>
								<Cell className="font-mono text-amber-300">
									{warrior.injuries}
								</Cell>
								<Cell className="font-mono text-amber-300">
									{warrior.knockedDowns}
								</Cell>
								<Cell className="text-stone-300">
									<div className="flex justify-end gap-3 [&_a]:text-stone-400 [&_a:hover]:text-stone-100 [&_a[data-danger]]:text-rose-400/80 [&_a[data-danger]:hover]:text-rose-300">
										<Link
											params={{ warriorId: warrior.id }}
											to="/warriors/$warriorId"
										>
											View
										</Link>
										<Link
											data-danger
											params={{ warriorId: warrior.id }}
											to="/warriors/$warriorId/delete"
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
					action={<Link to="/warriors/new">Create a warrior →</Link>}
					description="Add the first fighter to a campaign warband."
					title="No warriors yet"
				/>
			)}
		</IndexPage>
	);
}
