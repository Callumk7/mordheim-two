import { Link } from "@tanstack/react-router";
import type { Match } from "#/db/match";
import { formatStatus } from "../match-form";
import { TableActionLink, TableActions } from "../ui/table";
import { createDataTableColumnHelper, DataTable } from "./data-table";

const columnHelper = createDataTableColumnHelper<Match>();

const columns = columnHelper.columns([
	columnHelper.accessor("name", {
		header: "Match",
		meta: { isRowHeader: true },
		cell: ({ row }) => (
			<Link
				className="font-semibold text-foreground hover:text-primary"
				params={{ matchId: row.original.id }}
				to="/matches/$matchId"
			>
				{row.original.name}
			</Link>
		),
	}),
	columnHelper.accessor("scenario", { header: "Scenario" }),
	columnHelper.accessor((match) => formatStatus(match.status), {
		id: "status",
		header: "Status",
	}),
	columnHelper.display({
		id: "actions",
		header: "Actions",
		meta: { align: "end" },
		enableGlobalFilter: false,
		enableSorting: false,
		cell: ({ row }) => (
			<TableActions>
				<TableActionLink
					params={{ matchId: row.original.id }}
					to="/matches/$matchId"
				>
					View
				</TableActionLink>
				<TableActionLink
					params={{ matchId: row.original.id }}
					to="/matches/$matchId/delete"
					variant="destructive"
				>
					Delete
				</TableActionLink>
			</TableActions>
		),
	}),
]);

interface MatchesTableProps {
	matches: Match[];
}

export function MatchesTable({ matches }: MatchesTableProps) {
	return (
		<DataTable
			ariaLabel="Matches"
			columns={columns}
			data={matches}
			emptyMessage="No matches match your search."
			itemLabel={{ singular: "match", plural: "matches" }}
			searchPlaceholder="Search matches…"
			tableClassName="min-w-160"
		/>
	);
}
