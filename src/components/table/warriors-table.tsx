import { useNavigate } from "@tanstack/react-router";
import { Archive } from "lucide-react";
import { useMemo } from "react";
import { CombatStatValue } from "@/components/shared/stat-display";
import type { Warrior } from "@/db/validation/warrior";
import {
	type CombatStatsProjection,
	getWarriorCombatStats,
	type WarriorCombatStats,
} from "@/db-collections/projections";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { TableActions } from "../ui/table";
import { createDataTableColumnHelper, DataTable } from "./data-table";

type WarriorTableRow = Warrior & {
	combat: WarriorCombatStats;
	isEffectivelyArchived: boolean;
	warbandName: string;
};

const columnHelper = createDataTableColumnHelper<WarriorTableRow>();

interface WarriorsTableProps {
	archivedWarbandIds: ReadonlySet<string>;
	combatStats: CombatStatsProjection;
	warbandNames: Map<string, string>;
	warriors: Warrior[];
}

export function WarriorsTable({
	archivedWarbandIds,
	combatStats,
	warbandNames,
	warriors,
}: WarriorsTableProps) {
	const navigate = useNavigate({ from: "/warriors" });
	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor((warrior) => `${warrior.name} ${warrior.class}`, {
					id: "name",
					header: "Warrior",
					meta: { isRowHeader: true },
					cell: ({ row }) => (
						<>
							<div className="flex items-center gap-2">
								<span className="font-semibold text-foreground">
									{row.original.name}
								</span>
								{row.original.isEffectivelyArchived ? (
									<Badge className="text-muted-foreground" variant="outline">
										Archived
									</Badge>
								) : null}
							</div>
							<div className="mt-1 text-xs text-muted-foreground">
								{row.original.class}
							</div>
						</>
					),
				}),
				columnHelper.accessor("warbandName", { header: "Warband" }),
				columnHelper.accessor(
					(row) => (row.combat.isDead ? "Dead" : row.status),
					{ id: "status", header: "Status" },
				),
				columnHelper.accessor((row) => row.combat.injuriesGiven, {
					id: "injuriesGiven",
					header: "Injuries given",
					meta: { align: "end" },
					cell: ({ row }) => (
						<CombatStatValue stat="injuriesGiven" stats={row.original.combat} />
					),
				}),
				columnHelper.accessor((row) => row.combat.injuriesTaken, {
					id: "injuriesTaken",
					header: "Injuries taken",
					meta: { align: "end" },
					cell: ({ row }) => (
						<CombatStatValue stat="injuriesTaken" stats={row.original.combat} />
					),
				}),
				columnHelper.accessor((row) => row.combat.knockdownsGiven, {
					id: "knockdownsGiven",
					header: "KDs given",
					meta: { align: "end" },
					cell: ({ row }) => (
						<CombatStatValue
							stat="knockdownsGiven"
							stats={row.original.combat}
						/>
					),
				}),
				columnHelper.accessor((row) => row.combat.knockdownsTaken, {
					id: "knockdownsTaken",
					header: "KDs taken",
					meta: { align: "end" },
					cell: ({ row }) => (
						<CombatStatValue
							stat="knockdownsTaken"
							stats={row.original.combat}
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
							<Button
								aria-label={`Archive ${row.original.name}`}
								onPress={() =>
									navigate({
										to: "/warriors/$warriorId/delete",
										params: { warriorId: row.original.id },
									})
								}
								size="icon-xs"
								variant="destructive"
							>
								<Archive aria-hidden="true" />
							</Button>
						</TableActions>
					),
				}),
			]),
		[navigate],
	);
	const rows = useMemo<WarriorTableRow[]>(
		() =>
			warriors.map((warrior) => ({
				...warrior,
				combat: getWarriorCombatStats(combatStats, warrior.id),
				isEffectivelyArchived:
					warrior.isArchived || archivedWarbandIds.has(warrior.warbandId),
				warbandName: warbandNames.get(warrior.warbandId) ?? "Unknown warband",
			})),
		[archivedWarbandIds, combatStats, warbandNames, warriors],
	);

	return (
		<DataTable
			ariaLabel="Warriors"
			columns={columns}
			data={rows}
			emptyMessage="No warriors match your search."
			initialSorting={[{ id: "name", desc: false }]}
			itemLabel={{ singular: "warrior", plural: "warriors" }}
			onRowAction={(warrior) =>
				navigate({
					to: "/warriors/$warriorId",
					params: { warriorId: warrior.id },
				})
			}
			searchPlaceholder="Search warriors…"
			tableClassName="min-w-190"
		/>
	);
}
