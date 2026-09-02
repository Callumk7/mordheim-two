import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { Warrior } from "#/db/warrior";
import { TableActionLink, TableActions } from "../ui/table";
import { createDataTableColumnHelper, DataTable } from "./data-table";

type WarriorTableRow = Warrior & {
	warbandName: string;
};

const columnHelper = createDataTableColumnHelper<WarriorTableRow>();

const columns = columnHelper.columns([
	columnHelper.accessor((warrior) => `${warrior.name} ${warrior.class}`, {
		id: "name",
		header: "Warrior",
		meta: { isRowHeader: true },
		cell: ({ row }) => (
			<>
				<Link
					className="font-semibold text-foreground hover:text-primary"
					params={{ warriorId: row.original.id }}
					to="/warriors/$warriorId"
				>
					{row.original.name}
				</Link>
				<div className="mt-1 text-xs text-muted-foreground">
					{row.original.class}
				</div>
			</>
		),
	}),
	columnHelper.accessor("warbandName", { header: "Warband" }),
	columnHelper.accessor("status", { header: "Status" }),
	columnHelper.accessor("injuries", {
		header: "Injuries",
		meta: { align: "end" },
		cell: ({ getValue }) => (
			<span className="font-mono text-primary">{getValue()}</span>
		),
	}),
	columnHelper.accessor("knockedDowns", {
		header: "Knock downs",
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
					params={{ warriorId: row.original.id }}
					to="/warriors/$warriorId"
				>
					View
				</TableActionLink>
				<TableActionLink
					params={{ warriorId: row.original.id }}
					to="/warriors/$warriorId/delete"
					variant="destructive"
				>
					Delete
				</TableActionLink>
			</TableActions>
		),
	}),
]);

interface WarriorsTableProps {
	warbandNames: Map<string, string>;
	warriors: Warrior[];
}

export function WarriorsTable({ warbandNames, warriors }: WarriorsTableProps) {
	const rows = useMemo<WarriorTableRow[]>(
		() =>
			warriors.map((warrior) => ({
				...warrior,
				warbandName: warbandNames.get(warrior.warbandId) ?? "Unknown warband",
			})),
		[warbandNames, warriors],
	);

	return (
		<DataTable
			ariaLabel="Warriors"
			columns={columns}
			data={rows}
			emptyMessage="No warriors match your search."
			initialSorting={[{ id: "name", desc: false }]}
			itemLabel={{ singular: "warrior", plural: "warriors" }}
			searchPlaceholder="Search warriors…"
			tableClassName="min-w-190"
		/>
	);
}
