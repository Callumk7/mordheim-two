import { useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useMemo } from "react";
import type { Event } from "@/db/event";
import { Button } from "../ui/button";
import { TableActions } from "../ui/table";
import { createDataTableColumnHelper, DataTable } from "./data-table";

export type EventTableRow = Event & {
	attackerName: string;
	attackerWarriorName: string;
	defenderName: string;
	defenderWarriorName: string;
	matchName: string;
};

const columnHelper = createDataTableColumnHelper<EventTableRow>();

export function EventsTable({ events }: { events: EventTableRow[] }) {
	const navigate = useNavigate({ from: "/events" });
	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("matchName", {
					header: "Match",
					meta: { isRowHeader: true },
					cell: ({ row }) => (
						<span className="font-semibold text-foreground">
							{row.original.matchName}
						</span>
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
							<Button
								aria-label={`Delete event from ${row.original.matchName}`}
								onPress={() =>
									navigate({
										to: "/events/$eventId/delete",
										params: { eventId: row.original.id },
									})
								}
								size="icon-xs"
								variant="destructive"
							>
								<Trash2 aria-hidden="true" />
							</Button>
						</TableActions>
					),
				}),
			]),
		[navigate],
	);
	const rows = useMemo(() => events, [events]);

	return (
		<DataTable
			ariaLabel="Events"
			columns={columns}
			data={rows}
			emptyMessage="No events match your search."
			itemLabel={{ singular: "event", plural: "events" }}
			onRowAction={(event) =>
				navigate({
					to: "/events/$eventId",
					params: { eventId: event.id },
				})
			}
			searchPlaceholder="Search events…"
			tableClassName="min-w-190"
		/>
	);
}
