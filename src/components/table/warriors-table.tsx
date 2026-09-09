import { useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useMemo } from "react";
import type { Warrior } from "@/db/validation/warrior";
import {
	type CombatStatsProjection,
	getWarriorCombatStats,
	type WarriorCombatStats,
} from "@/db-collections/projections";
import { Button } from "../ui/button";
import { TableActions } from "../ui/table";
import { createDataTableColumnHelper, DataTable } from "./data-table";

type WarriorTableRow = Warrior & {
	combat: WarriorCombatStats;
	warbandName: string;
};

const columnHelper = createDataTableColumnHelper<WarriorTableRow>();

interface WarriorsTableProps {
	combatStats: CombatStatsProjection;
	warbandNames: Map<string, string>;
	warriors: Warrior[];
}

export function WarriorsTable({
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
							<span className="font-semibold text-foreground">
								{row.original.name}
							</span>
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
				}),
				columnHelper.accessor((row) => row.combat.injuriesTaken, {
					id: "injuriesTaken",
					header: "Injuries taken",
					meta: { align: "end" },
				}),
				columnHelper.accessor((row) => row.combat.knockdownsGiven, {
					id: "knockdownsGiven",
					header: "KDs given",
					meta: { align: "end" },
				}),
				columnHelper.accessor((row) => row.combat.knockdownsTaken, {
					id: "knockdownsTaken",
					header: "KDs taken",
					meta: { align: "end" },
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
								aria-label={`Delete ${row.original.name}`}
								onPress={() =>
									navigate({
										to: "/warriors/$warriorId/delete",
										params: { warriorId: row.original.id },
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
	const rows = useMemo<WarriorTableRow[]>(
		() =>
			warriors.map((warrior) => ({
				...warrior,
				combat: getWarriorCombatStats(combatStats, warrior.id),
				warbandName: warbandNames.get(warrior.warbandId) ?? "Unknown warband",
			})),
		[combatStats, warbandNames, warriors],
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
