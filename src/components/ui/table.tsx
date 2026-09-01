import type {
	ComponentPropsWithoutRef,
	CSSProperties,
	ReactNode,
	Ref,
} from "react";
import {
	Cell as AriaCell,
	Column as AriaColumn,
	Row as AriaRow,
	Table as AriaTable,
	TableBody as AriaTableBody,
	TableHeader as AriaTableHeader,
	type CellProps,
	type ColumnProps,
	composeRenderProps,
	type RowProps,
	type TableBodyProps,
	type TableHeaderProps,
	type TableProps,
} from "react-aria-components";

function withDefaultClassName(
	className: string | undefined,
	defaultClassName: string,
) {
	return [defaultClassName, className].filter(Boolean).join(" ");
}

type TableElement = HTMLDivElement | HTMLTableElement;
type TableSectionElement = HTMLDivElement | HTMLTableSectionElement;
type TableCellElement = HTMLDivElement | HTMLTableCellElement;
type TableRowElement = HTMLDivElement | HTMLTableRowElement;

type StyledTableProps = TableProps & {
	minWidth?: CSSProperties["minWidth"];
	ref?: Ref<TableElement>;
};

export function Table({
	className,
	minWidth,
	ref,
	style,
	...props
}: StyledTableProps) {
	return (
		<AriaTable
			{...props}
			ref={ref}
			className={composeRenderProps(className, (className) =>
				withDefaultClassName(
					className,
					"w-full border-collapse text-left text-sm",
				),
			)}
			style={composeRenderProps(style, (style) => ({ minWidth, ...style }))}
		/>
	);
}

export function TableHeader<T>({
	className,
	ref,
	...props
}: TableHeaderProps<T> & { ref?: Ref<TableSectionElement> }) {
	return (
		<AriaTableHeader
			{...props}
			ref={ref}
			className={composeRenderProps(className, (className) =>
				withDefaultClassName(
					className,
					"border-b border-stone-800 bg-stone-900/70 text-xs uppercase tracking-wider text-stone-500",
				),
			)}
		/>
	);
}

export function TableBody<T>({
	className,
	ref,
	...props
}: TableBodyProps<T> & { ref?: Ref<TableSectionElement> }) {
	return (
		<AriaTableBody
			{...props}
			ref={ref}
			className={composeRenderProps(className, (className) =>
				withDefaultClassName(className, "divide-y divide-stone-800/80"),
			)}
		/>
	);
}

export function Column({
	className,
	ref,
	...props
}: ColumnProps & { ref?: Ref<TableCellElement> }) {
	return (
		<AriaColumn
			{...props}
			ref={ref}
			className={composeRenderProps(className, (className) =>
				withDefaultClassName(className, "px-5 py-3.5 font-medium"),
			)}
		/>
	);
}

export function Row<T>({
	className,
	ref,
	...props
}: RowProps<T> & { ref?: Ref<TableRowElement> }) {
	return (
		<AriaRow
			{...props}
			ref={ref}
			className={composeRenderProps(className, (className) =>
				withDefaultClassName(className, "transition hover:bg-stone-900/60"),
			)}
		/>
	);
}

export function Cell({
	className,
	ref,
	...props
}: CellProps & { ref?: Ref<TableCellElement> }) {
	return (
		<AriaCell
			{...props}
			ref={ref}
			className={composeRenderProps(className, (className) =>
				withDefaultClassName(className, "px-5 py-4 text-stone-300"),
			)}
		/>
	);
}

export function TableContainer({
	children,
	className,
	...props
}: ComponentPropsWithoutRef<"div">) {
	return (
		<div
			{...props}
			className={withDefaultClassName(
				className,
				"overflow-hidden rounded-xl border border-stone-800 bg-stone-950/60",
			)}
		>
			<div className="overflow-x-auto">{children}</div>
		</div>
	);
}

export function TablePrimaryCell({ children }: { children: ReactNode }) {
	return (
		<Cell className="[&_a]:font-semibold [&_a]:text-stone-100 [&_a:hover]:text-amber-300">
			{children}
		</Cell>
	);
}

export function TableActions({ children }: { children: ReactNode }) {
	return (
		<Cell>
			<div className="flex justify-end gap-3 [&_a]:text-stone-400 [&_a:hover]:text-stone-100 [&_a[data-danger]]:text-rose-400/80 [&_a[data-danger]:hover]:text-rose-300">
				{children}
			</div>
		</Cell>
	);
}
