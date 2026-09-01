import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
	IndexTable,
	IndexTableActions,
	IndexTableBody,
	IndexTableCell,
	IndexTableHead,
	IndexTableHeader,
	IndexTableRow,
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
				<IndexTable minWidth={760}>
					<IndexTableHead>
						<IndexTableHeader>Warrior</IndexTableHeader>
						<IndexTableHeader>Warband</IndexTableHeader>
						<IndexTableHeader>Status</IndexTableHeader>
						<IndexTableHeader>Injuries</IndexTableHeader>
						<IndexTableHeader>Knock downs</IndexTableHeader>
						<IndexTableHeader align="right">Actions</IndexTableHeader>
					</IndexTableHead>
					<IndexTableBody>
						{warriors.map((warrior) => (
							<IndexTableRow key={warrior.id}>
								<IndexTableCell primary>
									<Link
										params={{ warriorId: warrior.id }}
										to="/warriors/$warriorId"
									>
										{warrior.name}
									</Link>
									<div className="mt-1 text-xs text-stone-500">
										{warrior.class}
									</div>
								</IndexTableCell>
								<IndexTableCell>
									{warbandNames.get(warrior.warbandId) ?? "Unknown warband"}
								</IndexTableCell>
								<IndexTableCell>{warrior.status}</IndexTableCell>
								<IndexTableCell tone="accent">
									{warrior.injuries}
								</IndexTableCell>
								<IndexTableCell tone="accent">
									{warrior.knockedDowns}
								</IndexTableCell>
								<IndexTableActions>
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
								</IndexTableActions>
							</IndexTableRow>
						))}
					</IndexTableBody>
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
