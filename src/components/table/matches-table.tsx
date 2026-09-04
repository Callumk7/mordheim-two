import { useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useMemo } from "react";
import type { Match } from "@/db/match";
import { formatStatus } from "../match-form";
import { Button } from "../ui/button";
import { TableActions } from "../ui/table";
import { createDataTableColumnHelper, DataTable } from "./data-table";

const columnHelper = createDataTableColumnHelper<Match>();

interface MatchesTableProps {
	matches: Match[];
}

export function MatchesTable({ matches }: MatchesTableProps) {
	const navigate = useNavigate({ from: "/matches" });
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
										to: "/matches/$matchId/delete",
										params: { matchId: row.original.id },
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

	return (
		<DataTable
			ariaLabel="Matches"
			columns={columns}
			data={matches}
			emptyMessage="No matches match your search."
			itemLabel={{ singular: "match", plural: "matches" }}
			onRowAction={(match) =>
				navigate({
					to: "/matches/$matchId",
					params: { matchId: match.id },
				})
			}
			searchPlaceholder="Search matches…"
			tableClassName="min-w-160"
		/>
	);
}
