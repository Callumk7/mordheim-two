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
				<IndexTable minWidth={720}>
					<IndexTableHead>
						<IndexTableHeader>Warband</IndexTableHeader>
						<IndexTableHeader>Captain</IndexTableHeader>
						<IndexTableHeader>Status</IndexTableHeader>
						<IndexTableHeader>Rating</IndexTableHeader>
						<IndexTableHeader align="right">Actions</IndexTableHeader>
					</IndexTableHead>
					<IndexTableBody>
						{warbands.map((warband) => (
							<IndexTableRow key={warband.id}>
								<IndexTableCell primary>
									<Link
										params={{ warbandId: warband.id }}
										to="/warbands/$warbandId"
									>
										{warband.name}
									</Link>
									<div className="mt-1 text-xs text-stone-500">
										{warband.faction}
									</div>
								</IndexTableCell>
								<IndexTableCell>{warband.captain}</IndexTableCell>
								<IndexTableCell>{warband.status}</IndexTableCell>
								<IndexTableCell tone="accent">{warband.rating}</IndexTableCell>
								<IndexTableActions>
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
								</IndexTableActions>
							</IndexTableRow>
						))}
					</IndexTableBody>
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
