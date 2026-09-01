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
				<TableContainer>
					<Table aria-label="Warbands" minWidth={720}>
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
									<TablePrimaryCell>
										<Link
											params={{ warbandId: warband.id }}
											to="/warbands/$warbandId"
										>
											{warband.name}
										</Link>
										<div className="mt-1 text-xs text-stone-500">
											{warband.faction}
										</div>
									</TablePrimaryCell>
									<Cell>{warband.captain}</Cell>
									<Cell>{warband.status}</Cell>
									<Cell className="font-mono text-amber-300">
										{warband.rating}
									</Cell>
									<TableActions>
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
									</TableActions>
								</Row>
							))}
						</TableBody>
					</Table>
				</TableContainer>
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
