import { useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useMemo } from "react";
import {
	EVENT_OUTCOMES,
	type EventOutcome,
	EventOutcomeSchema,
} from "@/db/validation/event";
import type { MatchEventRow } from "@/db-collections/projections";
import { Button } from "../ui/button";
import { TableActions } from "../ui/table";
import { TableCellSelect } from "../ui/table-cell-field";
import { createDataTableColumnHelper, DataTable } from "./data-table";

const columnHelper = createDataTableColumnHelper<MatchEventRow>();

function createColumns(
	onSetOutcome: (eventId: string, outcome: EventOutcome) => Promise<void>,
	onVoidEvent: (eventId: string) => void,
) {
	return columnHelper.columns([
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
					<span className="font-semibold text-foreground">
						{row.original.attackerWarriorName}
						<span className="block text-xs font-normal text-muted-foreground">
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
		columnHelper.accessor((event) => event.outcome ?? "", {
			id: "outcome",
			header: "Outcome",
			cell: ({ row }) =>
				row.original.voidedAt ? (
					<span className="text-muted-foreground">Voided</span>
				) : row.original.outcome !== null &&
					row.original.resolvedAt !== null ? (
					<span className="font-medium text-foreground">
						{row.original.outcome}
					</span>
				) : (
					<TableCellSelect
						aria-label={`Process event for ${row.original.attackerWarriorName} against ${row.original.defenderWarriorName}`}
						onCommit={(outcome) =>
							onSetOutcome(row.original.id, EventOutcomeSchema.parse(outcome))
						}
						options={EVENT_OUTCOMES}
						placeholder="Pick outcome"
						value=""
					/>
				),
		}),
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
			cell: ({ row }) =>
				row.original.voidedAt === null ? (
					<TableActions>
						<Button
							aria-label={`Void event for ${row.original.attackerWarriorName} against ${row.original.defenderWarriorName}`}
							onPress={() => onVoidEvent(row.original.id)}
							size="icon-xs"
							variant="destructive"
						>
							<Trash2 aria-hidden="true" />
						</Button>
					</TableActions>
				) : null,
		}),
	]);
}

export function MatchEventsTable({
	events,
	onSetOutcome,
}: {
	events: readonly MatchEventRow[];
	onSetOutcome: (eventId: string, outcome: EventOutcome) => Promise<void>;
}) {
	const navigate = useNavigate({ from: "/matches/$matchId/" });
	const columns = useMemo(
		() =>
			createColumns(onSetOutcome, (eventId) =>
				navigate({
					to: "/events/$eventId/delete",
					params: { eventId },
				}),
			),
		[navigate, onSetOutcome],
	);
	const rows = useMemo(() => [...events], [events]);

	return (
		<DataTable
			ariaLabel="Match events"
			columns={columns}
			data={rows}
			emptyMessage="No events have been recorded for this match."
			initialSorting={[{ id: "createdAt", desc: true }]}
			itemLabel={{ singular: "event", plural: "events" }}
			onRowAction={(event) =>
				navigate({
					to: "/events/$eventId",
					params: { eventId: event.id },
				})
			}
			searchPlaceholder="Search match events…"
			tableClassName="min-w-210"
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
