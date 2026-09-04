import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { MatchEventRow } from "@/db-collections/projections";
import { TableActionLink, TableActions } from "../ui/table";
import { createDataTableColumnHelper, DataTable } from "./data-table";

const columnHelper = createDataTableColumnHelper<MatchEventRow>();

const columns = columnHelper.columns([
	columnHelper.accessor("createdAt", {
		header: "Recorded",
		cell: ({ row }) => (
			<time
				className="whitespace-nowrap text-muted-foreground"
				dateTime={row.original.createdAt}
			>
				{formatRecordedAt(row.original.createdAt)}
			</time>
		),
	}),
	columnHelper.accessor(
		(event) => `${event.attackerName} ${event.attackerWarriorName}`,
		{
			id: "attacker",
			header: "Attacker",
			meta: { isRowHeader: true },
			cell: ({ row }) => (
				<Link
					className="font-semibold text-foreground hover:text-primary"
					params={{ eventId: row.original.id }}
					to="/events/$eventId"
				>
					{row.original.attackerWarriorName}
					<span className="block text-xs font-normal text-muted-foreground">
						{row.original.attackerName}
					</span>
				</Link>
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
			<span className="block max-w-80 truncate text-muted-foreground">
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

export function MatchEventsTable({
	events,
}: {
	events: readonly MatchEventRow[];
}) {
	const rows = useMemo(() => [...events], [events]);

	return (
		<DataTable
			ariaLabel="Match events"
			columns={columns}
			data={rows}
			emptyMessage="No events have been recorded for this match."
			initialSorting={[{ id: "createdAt", desc: true }]}
			itemLabel={{ singular: "event", plural: "events" }}
			searchPlaceholder="Search match events…"
			tableClassName="min-w-190"
		/>
	);
}

function formatRecordedAt(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;

	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}
