import { Link } from "@tanstack/react-router";
import type { Warband } from "#/db/warband";
import { TableActionLink, TableActions } from "../ui/table";
import { createDataTableColumnHelper, DataTable } from "./data-table";

const columnHelper = createDataTableColumnHelper<Warband>();

const columns = columnHelper.columns([
	columnHelper.accessor((warband) => `${warband.name} ${warband.faction}`, {
		id: "name",
		header: "Warband",
		meta: { isRowHeader: true },
		cell: ({ row }) => (
			<>
				<Link
					className="font-semibold text-foreground hover:text-primary"
					params={{ warbandId: row.original.id }}
					to="/warbands/$warbandId"
				>
					{row.original.name}
				</Link>
				<div className="mt-1 text-xs text-muted-foreground">
					{row.original.faction}
				</div>
			</>
		),
	}),
	columnHelper.accessor("captain", { header: "Captain" }),
	columnHelper.accessor("status", { header: "Status" }),
	columnHelper.accessor("rating", {
		header: "Rating",
		meta: { align: "end" },
		cell: ({ getValue }) => (
			<span className="font-mono text-primary">{getValue()}</span>
		),
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
					params={{ warbandId: row.original.id }}
					to="/warbands/$warbandId"
				>
					View
				</TableActionLink>
				<TableActionLink
					params={{ warbandId: row.original.id }}
					to="/warbands/$warbandId/delete"
					variant="destructive"
				>
					Delete
				</TableActionLink>
			</TableActions>
		),
	}),
]);

interface WarbandsTableProps {
	warbands: Warband[];
}

export function WarbandsTable({ warbands }: WarbandsTableProps) {
	return (
		<DataTable
			ariaLabel="Warbands"
			columns={columns}
			data={warbands}
			emptyMessage="No warbands match your search."
			initialSorting={[{ id: "name", desc: false }]}
			itemLabel={{ singular: "warband", plural: "warbands" }}
			searchPlaceholder="Search warbands…"
			tableClassName="min-w-180"
		/>
	);
}
