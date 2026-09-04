import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { Event } from "@/db/event";
import { TableActionLink, TableActions } from "../ui/table";
import { createDataTableColumnHelper, DataTable } from "./data-table";

export type EventTableRow = Event & {
	attackerName: string;
	attackerWarriorName: string;
	defenderName: string;
	defenderWarriorName: string;
	matchName: string;
};

const columnHelper = createDataTableColumnHelper<EventTableRow>();

const columns = columnHelper.columns([
	columnHelper.accessor("matchName", {
		header: "Match",
		meta: { isRowHeader: true },
		cell: ({ row }) => (
			<Link
				className="font-semibold text-foreground hover:text-primary"
				params={{ eventId: row.original.id }}
				to="/events/$eventId"
			>
				{row.original.matchName}
			</Link>
		),
	}),
	columnHelper.accessor(
		(event) => `${event.attackerName} ${event.attackerWarriorName}`,
		{
			id: "attacker",
			header: "Attacker",
			cell: ({ row }) => (
				<span>
					{row.original.attackerWarriorName}
					<span className="block text-xs text-muted-foreground">
						{row.original.attackerName}
					</span>
				</span>
			),
		},
	),
	columnHelper.accessor(
		(event) => `${event.defenderName} ${event.defenderWarriorName}`,
		{
			id: "defender",
			header: "Defender",
			cell: ({ row }) => (
				<span>
					{row.original.defenderWarriorName}
					<span className="block text-xs text-muted-foreground">
						{row.original.defenderName}
					</span>
				</span>
			),
		},
	),
	columnHelper.accessor((event) => event.notes ?? "", {
		id: "notes",
		header: "Notes",
		cell: ({ row }) => (
			<span className="block max-w-64 truncate text-muted-foreground">
				{row.original.notes || "—"}
			</span>
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
					params={{ eventId: row.original.id }}
					to="/events/$eventId"
				>
					View
				</TableActionLink>
				<TableActionLink
					params={{ eventId: row.original.id }}
					to="/events/$eventId/delete"
					variant="destructive"
				>
					Delete
				</TableActionLink>
			</TableActions>
		),
	}),
]);

export function EventsTable({ events }: { events: EventTableRow[] }) {
	const rows = useMemo(() => events, [events]);
	return (
		<DataTable
			ariaLabel="Events"
			columns={columns}
			data={rows}
			emptyMessage="No events match your search."
			itemLabel={{ singular: "event", plural: "events" }}
			searchPlaceholder="Search events…"
			tableClassName="min-w-190"
		/>
	);
}
