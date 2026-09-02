import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { Event } from "#/db/event";
import { TableActionLink, TableActions } from "../ui/table";
import { createDataTableColumnHelper, DataTable } from "./data-table";

type EventTableRow = Event & {
	attackerName: string;
	defenderName: string;
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
	columnHelper.accessor("attackerName", { header: "Attacker" }),
	columnHelper.accessor("defenderName", { header: "Defender" }),
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

interface EventsTableProps {
	events: Event[];
	matchNames: Map<string, string>;
	warbandNames: Map<string, string>;
}

export function EventsTable({
	events,
	matchNames,
	warbandNames,
}: EventsTableProps) {
	const rows = useMemo<EventTableRow[]>(
		() =>
			events.map((event) => ({
				...event,
				attackerName:
					warbandNames.get(event.attackerWarbandId) ?? "Unknown warband",
				defenderName:
					warbandNames.get(event.defenderWarbandId) ?? "Unknown warband",
				matchName: matchNames.get(event.matchId) ?? "Unknown match",
			})),
		[events, matchNames, warbandNames],
	);

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
