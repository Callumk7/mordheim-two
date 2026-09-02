import { useMemo } from "react";
import type { Warband } from "#/db/warband";
import { WARBAND_STATUSES } from "#/db/warband";
import { TableActionLink, TableActions } from "../ui/table";
import { TableCellInput, TableCellSelect } from "../ui/table-cell-field";
import { createDataTableColumnHelper, DataTable } from "./data-table";

const columnHelper = createDataTableColumnHelper<Warband>();

export type WarbandInlineUpdate = Partial<
	Pick<Warband, "captain" | "faction" | "name" | "rating" | "status">
>;

interface WarbandsTableProps {
	onUpdate: (id: string, changes: WarbandInlineUpdate) => Promise<void>;
	warbands: Warband[];
}

export function WarbandsTable({ onUpdate, warbands }: WarbandsTableProps) {
	const columns = useMemo(
		() =>
			columnHelper.columns([
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
						<TableCellInput
							aria-label={`Rating for ${row.original.name}`}
							className="min-w-20 text-right font-mono text-primary"
							min="0"
							onCommit={(rating) =>
								onUpdate(row.original.id, { rating: Number(rating) })
							}
							step="1"
							type="number"
							validate={(rating) =>
								/^\d+$/.test(rating)
									? undefined
									: "Rating must be a non-negative whole number."
							}
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
			searchPlaceholder="Search warbands…"
			tableClassName="min-w-180"
		/>
	);
}
