import { useNavigate } from "@tanstack/react-router";
import { LoaderCircle, Trash2 } from "lucide-react";
import { useMemo } from "react";
import type { GeneratedImageJob } from "@/components/shared/generated-image-status";
import { isActiveImageJobStatus } from "@/components/shared/use-image-generation-polling";
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

export type MatchEventImageJobs = Readonly<
	Record<string, GeneratedImageJob | undefined>
>;

const ILLUSTRATED_OUTCOMES: readonly EventOutcome[] = ["Injury", "Death"];

/** Mirrors submitEventImage: only these events ever get an illustration. */
function isIllustratable(event: MatchEventRow) {
	return (
		event.voidedAt === null &&
		event.outcome !== null &&
		ILLUSTRATED_OUTCOMES.includes(event.outcome)
	);
}

function describeImageJob(job: GeneratedImageJob | undefined) {
	if (!job) return "Not submitted";
	switch (job.status) {
		case "completed":
			return "Ready";
		case "pending":
			return "Waiting to generate";
		case "queued":
			return "Queued";
		case "processing":
			return "Generating";
		case "enqueue_failed":
			return "Could not queue";
		case "failed":
			return "Generation failed";
		case "consumed":
			return "Image unavailable";
		default:
			return "Status unavailable";
	}
}

/**
 * A warrior can only die once (events_effective_death_defender_unique), so do
 * not offer an outcome the server is bound to reject. Deaths recorded in other
 * matches are not in this table's scope, which is why resolveEvent still guards
 * the rule and reports it.
 */
function outcomesFor(
	event: MatchEventRow,
	deadWarriorIds: ReadonlySet<string>,
) {
	return deadWarriorIds.has(event.defenderWarriorId)
		? EVENT_OUTCOMES.filter((outcome) => outcome !== "Death")
		: EVENT_OUTCOMES;
}

function createColumns(
	onSetOutcome: (eventId: string, outcome: EventOutcome) => Promise<void>,
	onVoidEvent: (eventId: string) => void,
	imageJobs: MatchEventImageJobs,
	deadWarriorIds: ReadonlySet<string>,
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
						options={outcomesFor(row.original, deadWarriorIds)}
						placeholder="Pick outcome"
						value=""
					/>
				),
		}),
		columnHelper.accessor(
			(event) =>
				isIllustratable(event) ? describeImageJob(imageJobs[event.id]) : "",
			{
				id: "illustration",
				header: "Illustration",
				cell: ({ row }) => {
					if (!isIllustratable(row.original)) {
						return <span className="text-muted-foreground">—</span>;
					}
					const job = imageJobs[row.original.id];
					const isActive = job ? isActiveImageJobStatus(job.status) : false;
					const isFailure =
						job !== undefined &&
						["failed", "enqueue_failed", "consumed"].includes(job.status);
					return (
						<span
							aria-live={isActive ? "polite" : undefined}
							className={
								job?.status === "completed"
									? "whitespace-nowrap font-medium text-foreground"
									: "inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground"
							}
							role={isActive ? "status" : isFailure ? "alert" : undefined}
						>
							{isActive ? (
								<LoaderCircle
									aria-hidden="true"
									className="size-3.5 animate-spin"
								/>
							) : null}
							{describeImageJob(job)}
						</span>
					);
				},
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

const NO_IMAGE_JOBS: MatchEventImageJobs = {};
const NO_DEAD_WARRIORS: ReadonlySet<string> = new Set();

export function MatchEventsTable({
	campaignId,
	deadWarriorIds = NO_DEAD_WARRIORS,
	events,
	imageJobs = NO_IMAGE_JOBS,
	onSetOutcome,
}: {
	campaignId: string;
	deadWarriorIds?: ReadonlySet<string>;
	events: readonly MatchEventRow[];
	imageJobs?: MatchEventImageJobs;
	onSetOutcome: (eventId: string, outcome: EventOutcome) => Promise<void>;
}) {
	const navigate = useNavigate({
		from: "/campaigns/$campaignId/matches/$matchId/",
	});
	const columns = useMemo(
		() =>
			createColumns(
				onSetOutcome,
				(eventId) =>
					navigate({
						to: "/campaigns/$campaignId/events/$eventId/delete",
						params: { campaignId, eventId },
					}),
				imageJobs,
				deadWarriorIds,
			),
		[campaignId, deadWarriorIds, imageJobs, navigate, onSetOutcome],
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
					to: "/campaigns/$campaignId/events/$eventId",
					params: { campaignId, eventId: event.id },
				})
			}
			searchPlaceholder="Search match events…"
			tableClassName="min-w-240"
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
