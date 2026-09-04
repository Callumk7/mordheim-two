import { ChevronRight, Users } from "lucide-react";
import { useMemo } from "react";
import type { Warband } from "#/db/warband";
import { WARBAND_STATUSES } from "#/db/warband";
import type { Warrior } from "@/db/warrior";
import { Button } from "../ui/button";
import { TableActionLink, TableActions } from "../ui/table";
import {
	TableCellInput,
	TableCellNumberField,
	TableCellSelect,
} from "../ui/table-cell-field";
import { createDataTableColumnHelper, DataTable } from "./data-table";

type WarbandWithWarriors = Warband & { warriors: Warrior[] };

const columnHelper = createDataTableColumnHelper<WarbandWithWarriors>();

export type WarbandInlineUpdate = Partial<
	Pick<Warband, "captain" | "faction" | "name" | "rating" | "status">
>;

interface WarbandsTableProps {
	onUpdate: (id: string, changes: WarbandInlineUpdate) => Promise<void>;
	warbands: WarbandWithWarriors[];
}

function WarbandWarriors({ warband }: { warband: WarbandWithWarriors }) {
	const warriors = warband.warriors;

	return (
		<div className="px-4 py-4 sm:px-12">
			<div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
				<Users aria-hidden="true" className="size-4 text-primary" />
				{warriors.length} {warriors.length === 1 ? "warrior" : "warriors"}
			</div>
			{warriors.length ? (
				<div className="grid gap-2">
					{warriors.map((warrior) => (
						<div
							className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-lg border border-border bg-background px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
							key={warrior.id}
						>
							<div className="min-w-0">
								<p className="truncate font-medium text-foreground">
									{warrior.name}
								</p>
								<p className="truncate text-xs text-muted-foreground">
									{warrior.class} · {warrior.status}
								</p>
							</div>
							<span className="hidden text-xs text-muted-foreground sm:block">
								{warrior.injuries} injuries
							</span>
							<span className="hidden text-xs text-muted-foreground sm:block">
								{warrior.knockedDowns} knock downs
							</span>
							<TableActionLink
								params={{ warriorId: warrior.id }}
								to="/warriors/$warriorId"
							>
								View
							</TableActionLink>
						</div>
					))}
				</div>
			) : (
				<p className="text-sm text-muted-foreground">
					No warriors have joined this warband yet.
				</p>
			)}
		</div>
	);
}

export function WarbandsTable({ onUpdate, warbands }: WarbandsTableProps) {
	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.display({
					id: "expand",
					header: "",
					enableGlobalFilter: false,
					enableSorting: false,
					cell: ({ row }) => (
						<Button
							aria-label={`${row.getIsExpanded() ? "Collapse" : "Expand"} warriors for ${row.original.name}`}
							aria-expanded={row.getIsExpanded()}
							onPress={row.getToggleExpandedHandler()}
							size="icon-xs"
							variant="ghost"
						>
							<ChevronRight
								aria-hidden="true"
								className={`transition-transform ${row.getIsExpanded() ? "rotate-90" : ""}`}
							/>
						</Button>
					),
				}),
				columnHelper.accessor(
					(warband) => `${warband.name} ${warband.faction}`,
					{
						id: "name",
						header: "Warband",
						meta: { isRowHeader: true },
						cell: ({ row }) => (
							<div className="flex min-w-44 flex-col gap-0.5">
								<TableCellInput
									aria-label={`Warband name for ${row.original.name}`}
									className="font-semibold text-foreground"
									onCommit={(name) =>
										onUpdate(row.original.id, { name: name.trim() })
									}
									validate={(name) =>
										name.trim() ? undefined : "Warband name is required."
									}
									value={row.original.name}
								/>
								<TableCellInput
									aria-label={`Faction for ${row.original.name}`}
									className="text-xs text-muted-foreground"
									onCommit={(faction) =>
										onUpdate(row.original.id, { faction: faction.trim() })
									}
									validate={(faction) =>
										faction.trim() ? undefined : "Faction is required."
									}
									value={row.original.faction}
								/>
							</div>
						),
					},
				),
				columnHelper.accessor("captain", {
					header: "Captain",
					cell: ({ row }) => (
						<TableCellInput
							aria-label={`Captain for ${row.original.name}`}
							className="min-w-32"
							onCommit={(captain) =>
								onUpdate(row.original.id, { captain: captain.trim() })
							}
							validate={(captain) =>
								captain.trim() ? undefined : "Captain is required."
							}
							value={row.original.captain}
						/>
					),
				}),
				columnHelper.accessor("status", {
					header: "Status",
					cell: ({ row }) => (
						<TableCellSelect
							aria-label={`Status for ${row.original.name}`}
							className="min-w-28"
							onCommit={(status) =>
								onUpdate(row.original.id, {
									status: status as Warband["status"],
								})
							}
							options={WARBAND_STATUSES}
							value={row.original.status}
						/>
					),
				}),
				columnHelper.accessor("rating", {
					header: "Rating",
					meta: { align: "end" },
					cell: ({ row }) => (
						<TableCellNumberField
							aria-label={`Rating for ${row.original.name}`}
							className="min-w-20 font-mono text-primary"
							isRequired
							minValue={0}
							onCommit={(rating) => onUpdate(row.original.id, { rating })}
							step={1}
							value={row.original.rating}
						/>
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
			]),
		[onUpdate],
	);

	return (
		<DataTable
			ariaLabel="Warbands"
			columns={columns}
			data={warbands}
			emptyMessage="No warbands match your search."
			initialSorting={[{ id: "name", desc: false }]}
			itemLabel={{ singular: "warband", plural: "warbands" }}
			renderExpandedRow={(warband) => <WarbandWarriors warband={warband} />}
			searchPlaceholder="Search warbands…"
			tableClassName="min-w-180"
		/>
	);
}
