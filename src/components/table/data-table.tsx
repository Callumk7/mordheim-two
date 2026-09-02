import {
	columnFilteringFeature,
	createFilteredRowModel,
	createSortedRowModel,
	createTableHook,
	filterFn_includesString,
	globalFilteringFeature,
	metaHelper,
	type RowData,
	rowSortingFeature,
	type SortingState,
	type TableOptions,
	tableFeatures,
} from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import { cn } from "#/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TableSortableHead,
} from "../ui/table";

interface DataTableColumnMeta {
	align?: "start" | "end";
	isRowHeader?: boolean;
}

const features = tableFeatures({
	columnMeta: metaHelper<DataTableColumnMeta>(),
	columnFilteringFeature,
	globalFilteringFeature,
	filteredRowModel: createFilteredRowModel(),
	filterFns: { includesString: filterFn_includesString },
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
});

const { createAppColumnHelper, useAppTable } = createTableHook({
	features,
	getColumnCanGlobalFilter: (column) => column.id !== "actions",
	getRowId: (row: { id: string }) => row.id,
	globalFilterFn: "includesString",
});

export const createDataTableColumnHelper = createAppColumnHelper;

type DataTableColumns<TData extends RowData> = TableOptions<
	typeof features,
	TData
>["columns"];

interface DataTableItemLabel {
	plural: string;
	singular: string;
}

interface DataTableProps<TData extends RowData & { id: string }> {
	ariaLabel: string;
	columns: DataTableColumns<TData>;
	data: TData[];
	emptyMessage: string;
	initialSorting?: SortingState;
	itemLabel: DataTableItemLabel;
	searchPlaceholder: string;
	tableClassName?: string;
}

interface DataTableToolbarProps {
	filteredCount: number;
	itemLabel: DataTableItemLabel;
	onClear: () => void;
	onFilterChange: (value: string) => void;
	placeholder: string;
	totalCount: number;
	value: string;
}

function DataTableToolbar({
	filteredCount,
	itemLabel,
	onClear,
	onFilterChange,
	placeholder,
	totalCount,
	value,
}: DataTableToolbarProps) {
	const label = totalCount === 1 ? itemLabel.singular : itemLabel.plural;

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
			<div className="relative w-full sm:max-w-xs">
				<Search
					aria-hidden="true"
					className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					aria-label={placeholder}
					className="bg-card pr-9 pl-9"
					onChange={(event) => onFilterChange(event.target.value)}
					placeholder={placeholder}
					value={value}
				/>
				{value ? (
					<Button
						aria-label="Clear search"
						className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
						onPress={onClear}
						size="icon-xs"
						variant="ghost"
					>
						<X aria-hidden="true" />
					</Button>
				) : null}
			</div>
			<output
				aria-live="polite"
				className="text-sm text-muted-foreground sm:ml-auto"
			>
				{filteredCount} of {totalCount} {label}
			</output>
		</div>
	);
}

export function DataTable<TData extends RowData & { id: string }>({
	ariaLabel,
	columns,
	data,
	emptyMessage,
	initialSorting = [],
	itemLabel,
	searchPlaceholder,
	tableClassName,
}: DataTableProps<TData>) {
	const table = useAppTable({
		columns,
		data,
		initialState: { sorting: initialSorting },
	});
	const rows = table.getRowModel().rows;
	const globalFilter = table.state.globalFilter ?? "";

	return (
		<div className="space-y-4">
			<DataTableToolbar
				filteredCount={rows.length}
				itemLabel={itemLabel}
				onClear={() => table.resetGlobalFilter()}
				onFilterChange={(value) => table.setGlobalFilter(value)}
				placeholder={searchPlaceholder}
				totalCount={data.length}
				value={globalFilter}
			/>

			<div className="overflow-hidden rounded-xl border border-border bg-card">
				<Table aria-label={ariaLabel} className={tableClassName}>
					<TableHeader className="bg-muted/30">
						{table.getHeaderGroups()[0]?.headers.map((header) => {
							const align = header.column.columnDef.meta?.align;

							return header.column.getCanSort() ? (
								<TableSortableHead
									align={align}
									direction={header.column.getIsSorted()}
									isRowHeader={header.column.columnDef.meta?.isRowHeader}
									key={header.id}
									onSort={() => header.column.toggleSorting()}
								>
									{header.isPlaceholder ? null : (
										<table.FlexRender header={header} />
									)}
								</TableSortableHead>
							) : (
								<TableHead
									className={cn("h-11", align === "end" && "text-right")}
									key={header.id}
								>
									{header.isPlaceholder ? null : (
										<table.FlexRender header={header} />
									)}
								</TableHead>
							);
						})}
					</TableHeader>
					<TableBody
						renderEmptyState={() => (
							<span className="text-muted-foreground">{emptyMessage}</span>
						)}
					>
						{rows.map((row) => (
							<TableRow key={row.id}>
								{row.getAllCells().map((cell) => (
									<TableCell
										className={cn(
											cell.column.columnDef.meta?.align === "end" &&
												"text-right",
										)}
										key={cell.id}
									>
										<table.FlexRender cell={cell} />
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
