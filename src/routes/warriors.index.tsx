import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
} from "../components/index-page";
import {
	Cell,
	Column,
	Row,
	Table,
	TableActions,
	TableBody,
	TableContainer,
	TableHeader,
	TablePrimaryCell,
} from "../components/ui/table";
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
				<TableContainer>
					<Table aria-label="Warriors" minWidth={760}>
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
									<TablePrimaryCell>
										<Link
											params={{ warriorId: warrior.id }}
											to="/warriors/$warriorId"
										>
											{warrior.name}
										</Link>
										<div className="mt-1 text-xs text-stone-500">
											{warrior.class}
										</div>
									</TablePrimaryCell>
									<Cell>
										{warbandNames.get(warrior.warbandId) ?? "Unknown warband"}
									</Cell>
									<Cell>{warrior.status}</Cell>
									<Cell className="font-mono text-amber-300">
										{warrior.injuries}
									</Cell>
									<Cell className="font-mono text-amber-300">
										{warrior.knockedDowns}
									</Cell>
									<TableActions>
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
									</TableActions>
								</Row>
							))}
						</TableBody>
					</Table>
				</TableContainer>
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
