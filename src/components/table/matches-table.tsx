import { useNavigate } from "@tanstack/react-router";
import { Archive } from "lucide-react";
import { useMemo } from "react";
import type { Match } from "@/db/validation/match";
import type { Warband } from "@/db/validation/warband";
import { formatStatus } from "../match-form";
import { Button } from "../ui/button";
import { TableActions } from "../ui/table";
import { createDataTableColumnHelper, DataTable } from "./data-table";

const columnHelper = createDataTableColumnHelper<Match>();

interface MatchesTableProps {
	campaignId: string;
	matches: Match[];
	warbands: Warband[];
}

export function MatchesTable({
	campaignId,
	matches,
	warbands,
}: MatchesTableProps) {
	const navigate = useNavigate({
		from: "/campaigns/$campaignId/matches",
	});
	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("name", {
					header: "Match",
					meta: { isRowHeader: true },
					cell: ({ row }) => (
						<span className="font-semibold text-foreground">
							{row.original.name}
						</span>
					),
				}),
				columnHelper.accessor("scenario", { header: "Scenario" }),
				columnHelper.accessor((match) => formatStatus(match.status), {
					id: "status",
					header: "Status",
				}),
				columnHelper.accessor(
					(match) => {
						if (match.result !== "Victory") return match.result;
						const winner = warbands.find(
							(warband) => warband.id === match.winnerWarbandId,
						);
						return `${winner?.name ?? "Unknown warband"} won`;
					},
					{ id: "result", header: "Result" },
				),
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
										to: "/campaigns/$campaignId/matches/$matchId/delete",
										params: { campaignId, matchId: row.original.id },
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
		[campaignId, navigate, warbands],
	);

	return (
		<DataTable
			ariaLabel="Matches"
			columns={columns}
			data={matches}
			emptyMessage="No matches match your search."
			itemLabel={{ singular: "match", plural: "matches" }}
			onRowAction={(match) =>
				navigate({
					to: "/campaigns/$campaignId/matches/$matchId",
					params: { campaignId, matchId: match.id },
				})
			}
			searchPlaceholder="Search matches…"
			tableClassName="min-w-160"
		/>
	);
}
