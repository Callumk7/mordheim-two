import { useNavigate } from "@tanstack/react-router";
import { Archive, ChevronRight, Eye, Users } from "lucide-react";
import { useMemo } from "react";
import { CombatStatValue } from "@/components/shared/stat-display";
import type { Warband } from "@/db/validation/warband";
import type { Warrior } from "@/db/validation/warrior";
import {
	type CombatStatsProjection,
	getWarbandCombatStats,
	getWarriorCombatStats,
} from "@/db-collections/projections";
import { Badge } from "../ui/badge";
import { Button, LinkButton } from "../ui/button";
import { TableActions } from "../ui/table";
import { TableCellNumberField } from "../ui/table-cell-field";
import { createDataTableColumnHelper, DataTable } from "./data-table";

type WarbandWithWarriors = Warband & { warriors: Warrior[] };

const columnHelper = createDataTableColumnHelper<WarbandWithWarriors>();

interface WarbandsTableProps {
	campaignId: string;
	combatStats: CombatStatsProjection;
	warbands: WarbandWithWarriors[];
	onAddWarrior: (warband: Warband) => void;
	onUpdateGold: (warbandId: string, gold: number) => Promise<void>;
	onUpdateRating: (warbandId: string, rating: number) => Promise<void>;
}

function WarbandWarriors({
	campaignId,
	combatStats,
	onAddWarrior,
	warband,
}: {
	campaignId: string;
	combatStats: CombatStatsProjection;
	onAddWarrior: (warband: Warband) => void;
	warband: WarbandWithWarriors;
}) {
	const warriors = warband.warriors;

	return (
		<div className="px-4 py-4 sm:px-12">
			<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2 text-sm font-medium text-foreground">
					<Users aria-hidden="true" className="size-4 text-primary" />
					{warriors.length} {warriors.length === 1 ? "warrior" : "warriors"}
				</div>
				<Button
					aria-label={`Add warrior to ${warband.name}`}
					isDisabled={warband.isArchived}
					onPress={() => onAddWarrior(warband)}
					size="sm"
					variant="outline"
				>
					Add warrior
				</Button>
			</div>
			{warriors.length ? (
				<div className="grid gap-2">
					{warriors.map((warrior) => {
						const stats = getWarriorCombatStats(combatStats, warrior.id);
						return (
							<div
								className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-lg border border-border bg-background px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]"
								key={warrior.id}
							>
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<p className="truncate font-medium text-foreground">
											{warrior.name}
										</p>
										{warrior.isArchived ? (
											<Badge
												className="text-muted-foreground"
												variant="outline"
											>
												Archived
											</Badge>
										) : null}
									</div>
									<p className="truncate text-xs text-muted-foreground">
										{warrior.class} · {stats.isDead ? "Dead" : "Alive"}
									</p>
								</div>
								<span className="hidden text-xs text-muted-foreground sm:block">
									{warrior.experience} XP
								</span>
								<span className="hidden text-xs text-muted-foreground sm:block">
									<CombatStatValue stat="injuriesTaken" stats={stats} />{" "}
									injuries
								</span>
								<span className="hidden text-xs text-muted-foreground sm:block">
									<CombatStatValue stat="knockdownsTaken" stats={stats} />{" "}
									knockdowns
								</span>
								<LinkButton
									aria-label={`View warrior ${warrior.name}`}
									params={{ campaignId, warriorId: warrior.id }}
									size="icon-xs"
									to="/campaigns/$campaignId/warriors/$warriorId"
									variant="ghost"
								>
									<Eye aria-hidden="true" />
								</LinkButton>
							</div>
						);
					})}
				</div>
			) : (
				<p className="text-sm text-muted-foreground">
					No warriors have joined this warband yet.
				</p>
			)}
		</div>
	);
}

export function WarbandsTable({
	campaignId,
	combatStats,
	onAddWarrior,
	onUpdateGold,
	onUpdateRating,
	warbands,
}: WarbandsTableProps) {
	const navigate = useNavigate({ from: "/campaigns/$campaignId/warbands" });
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
								<div className="flex items-center gap-2">
									<span className="font-semibold text-foreground">
										{row.original.name}
									</span>
									{row.original.isArchived ? (
										<Badge className="text-muted-foreground" variant="outline">
											Archived
										</Badge>
									) : null}
								</div>
								<span className="text-xs text-muted-foreground">
									{row.original.faction}
								</span>
							</div>
						),
					},
				),
				columnHelper.accessor("gold", {
					header: "Gold",
					meta: { align: "end" },
					cell: ({ row }) => (
						<TableCellNumberField
							aria-label={`Gold for ${row.original.name}`}
							minValue={0}
							onCommit={(gold) => onUpdateGold(row.original.id, gold)}
							step={1}
							value={row.original.gold}
						/>
					),
				}),
				columnHelper.accessor("wins", {
					header: "Wins",
					meta: { align: "end" },
				}),
				columnHelper.accessor(
					(warband) =>
						getWarbandCombatStats(combatStats, warband.id).deathsGiven,
					{
						id: "deathsGiven",
						header: "Deaths given",
						meta: { align: "end" },
						cell: ({ row }) => (
							<CombatStatValue
								stat="deathsGiven"
								stats={getWarbandCombatStats(combatStats, row.original.id)}
							/>
						),
					},
				),
				columnHelper.accessor("rating", {
					header: "Rating",
					meta: { align: "end" },
					cell: ({ row }) => (
						<TableCellNumberField
							aria-label={`Rating for ${row.original.name}`}
							minValue={0}
							onCommit={(rating) => onUpdateRating(row.original.id, rating)}
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
							<Button
								aria-label={`Archive ${row.original.name}`}
								onPress={() =>
									navigate({
										to: "/campaigns/$campaignId/warbands/$warbandId/delete",
										params: { campaignId, warbandId: row.original.id },
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
		[campaignId, combatStats, navigate, onUpdateGold, onUpdateRating],
	);

	return (
		<DataTable
			ariaLabel="Warbands"
			columns={columns}
			data={warbands}
			emptyMessage="No warbands match your search."
			initialSorting={[{ id: "name", desc: false }]}
			itemLabel={{ singular: "warband", plural: "warbands" }}
			onRowAction={(warband) =>
				navigate({
					to: "/campaigns/$campaignId/warbands/$warbandId",
					params: { campaignId, warbandId: warband.id },
				})
			}
			renderExpandedRow={(warband) => (
				<WarbandWarriors
					campaignId={campaignId}
					combatStats={combatStats}
					onAddWarrior={onAddWarrior}
					warband={warband}
				/>
			)}
			searchPlaceholder="Search warbands…"
			tableClassName="min-w-180"
		/>
	);
}
