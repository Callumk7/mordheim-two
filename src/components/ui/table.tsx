import { createLink } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type * as React from "react";
import {
	Button as ButtonPrimitive,
	Cell as CellPrimitive,
	type CellProps,
	Column as ColumnPrimitive,
	type ColumnProps,
	Link as LinkPrimitive,
	type LinkProps as LinkPrimitiveProps,
	Row as RowPrimitive,
	type RowProps,
	TableBody as TableBodyPrimitive,
	type TableBodyProps,
	TableFooter as TableFooterPrimitive,
	type TableFooterProps,
	TableHeader as TableHeaderPrimitive,
	type TableHeaderProps,
	Table as TablePrimitive,
	type TableProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";

function Table({ className, ...props }: TableProps) {
	return (
		<div
			data-slot="table-container"
			className="relative w-full overflow-x-auto"
		>
			<TablePrimitive
				data-slot="table"
				className={cn("w-full caption-bottom text-sm", className)}
				{...props}
			/>
		</div>
	);
}

function TableHeader<T>({ className, ...props }: TableHeaderProps<T>) {
	return (
		<TableHeaderPrimitive
			data-slot="table-header"
			className={cn("[&_tr]:border-b", className)}
			{...props}
		/>
	);
}

function TableBody<T>({ className, ...props }: TableBodyProps<T>) {
	return (
		<TableBodyPrimitive
			data-slot="table-body"
			className={cn(
				"data-empty:h-24 data-empty:text-center [&_tr:last-child]:border-0",
				className,
			)}
			{...props}
		/>
	);
}

function TableFooter<T>({ className, ...props }: TableFooterProps<T>) {
	return (
		<TableFooterPrimitive
			data-slot="table-footer"
			className={cn(
				"border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
				className,
			)}
			{...props}
		/>
	);
}

function TableRow<T>({ className, ...props }: RowProps<T>) {
	return (
		<RowPrimitive
			data-slot="table-row"
			className={cn(
				"border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted data-selected:bg-muted",
				className,
			)}
			{...props}
		/>
	);
}

function TableHead({ className, ...props }: ColumnProps) {
	return (
		<ColumnPrimitive
			data-slot="table-head"
			className={cn(
				"h-12 px-3 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([data-slot=checkbox])]:pr-0 [&:has([role=checkbox])]:pr-0",
				className,
			)}
			{...props}
		/>
	);
}

function TableCell({ className, ...props }: CellProps) {
	return (
		<CellPrimitive
			data-slot="table-cell"
			className={cn(
				"p-3 align-middle whitespace-nowrap [&:has([data-slot=checkbox])]:pr-0 [&:has([role=checkbox])]:pr-0",
				className,
			)}
			{...props}
		/>
	);
}

type TableSortDirection = false | "asc" | "desc";

interface TableSortableHeadProps
	extends Omit<ColumnProps, "children" | "className"> {
	align?: "start" | "end";
	children: React.ReactNode;
	className?: string;
	direction: TableSortDirection;
	onSort: () => void;
}

function TableSortableHead({
	align = "start",
	children,
	className,
	direction,
	onSort,
	...props
}: TableSortableHeadProps) {
	const SortIcon =
		direction === "asc"
			? ArrowUp
			: direction === "desc"
				? ArrowDown
				: ChevronsUpDown;

	return (
		<TableHead
			aria-sort={
				direction === "asc"
					? "ascending"
					: direction === "desc"
						? "descending"
						: "none"
			}
			className={cn("h-11", align === "end" && "text-right", className)}
			{...props}
		>
			<ButtonPrimitive
				className={cn(
					"inline-flex w-full cursor-pointer items-center gap-1.5 rounded-sm text-sm font-medium outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring",
					align === "end" ? "justify-end" : "justify-start",
				)}
				onPress={onSort}
			>
				{children}
				<SortIcon
					aria-hidden="true"
					className={cn(
						"size-3.5",
						direction === false && "text-muted-foreground/60",
					)}
				/>
				<span className="sr-only">
					{direction === "asc"
						? "Sorted ascending"
						: direction === "desc"
							? "Sorted descending"
							: "Not sorted"}
				</span>
			</ButtonPrimitive>
		</TableHead>
	);
}

function TableActions({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex justify-end gap-3", className)}
			data-slot="table-actions"
			{...props}
		/>
	);
}

function TableActionLinkPrimitive({
	className,
	variant = "default",
	...props
}: Omit<LinkPrimitiveProps, "className"> & {
	className?: string;
	variant?: "default" | "destructive";
}) {
	return (
		<LinkPrimitive
			className={cn(
				variant === "default"
					? "text-muted-foreground hover:text-foreground"
					: "text-destructive/80 hover:text-destructive",
				className,
			)}
			data-slot="table-action-link"
			{...props}
		/>
	);
}

const TableActionLink = createLink(TableActionLinkPrimitive);

function TableCaption({
	className,
	...props
}: React.ComponentProps<"figcaption">) {
	return (
		<figcaption
			data-slot="table-caption"
			className={cn(
				"mt-4 text-center text-sm text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Table,
	TableActionLink,
	TableActions,
	TableHeader,
	TableBody,
	TableFooter,
	TableHead,
	TableSortableHead,
	TableRow,
	TableCell,
	TableCaption,
};
