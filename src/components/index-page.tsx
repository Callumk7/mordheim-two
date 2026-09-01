import type { CSSProperties, ReactNode } from "react";

type ChildrenProps = {
	children: ReactNode;
};

export function IndexPage({ children }: ChildrenProps) {
	return <div className="grid gap-8">{children}</div>;
}

export function IndexPageHeader({
	action,
	description,
	eyebrow,
	title,
}: {
	action: ReactNode;
	description: ReactNode;
	eyebrow: ReactNode;
	title: ReactNode;
}) {
	return (
		<header className="flex flex-col justify-between gap-5 border-b border-stone-800 pb-7 sm:flex-row sm:items-end">
			<div>
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400">
					{eyebrow}
				</p>
				<h1 className="mt-2 font-serif text-4xl font-semibold text-stone-100 sm:text-5xl">
					{title}
				</h1>
				<p className="mt-2 text-stone-400">{description}</p>
			</div>
			<div className="[&>a]:inline-flex [&>a]:w-fit [&>a]:rounded-lg [&>a]:bg-amber-400 [&>a]:px-4 [&>a]:py-2.5 [&>a]:font-semibold [&>a]:text-stone-950 [&>a]:transition [&>a:hover]:bg-amber-300">
				{action}
			</div>
		</header>
	);
}

export function IndexTable({
	children,
	minWidth,
}: ChildrenProps & { minWidth: number }) {
	return (
		<div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-950/60">
			<div className="overflow-x-auto">
				<table
					className="w-full border-collapse text-left text-sm"
					style={{ minWidth } satisfies CSSProperties}
				>
					{children}
				</table>
			</div>
		</div>
	);
}

export function IndexTableHead({ children }: ChildrenProps) {
	return (
		<thead className="border-b border-stone-800 bg-stone-900/70 text-xs uppercase tracking-wider text-stone-500">
			<tr>{children}</tr>
		</thead>
	);
}

export function IndexTableHeader({
	align = "left",
	children,
}: ChildrenProps & { align?: "left" | "right" }) {
	return (
		<th
			className={`px-5 py-3.5 font-medium ${align === "right" ? "text-right" : ""}`}
		>
			{children}
		</th>
	);
}

export function IndexTableBody({ children }: ChildrenProps) {
	return <tbody className="divide-y divide-stone-800/80">{children}</tbody>;
}

export function IndexTableRow({ children }: ChildrenProps) {
	return <tr className="transition hover:bg-stone-900/60">{children}</tr>;
}

export function IndexTableCell({
	children,
	className = "",
	primary = false,
	tone = "default",
}: ChildrenProps & {
	className?: string;
	primary?: boolean;
	tone?: "default" | "muted" | "accent";
}) {
	const toneClassName = {
		accent: "font-mono text-amber-300",
		default: "text-stone-300",
		muted: "text-stone-400",
	}[tone];
	const primaryClassName = primary
		? "[&_a]:font-semibold [&_a]:text-stone-100 [&_a:hover]:text-amber-300"
		: "";

	return (
		<td
			className={`px-5 py-4 ${toneClassName} ${primaryClassName} ${className}`}
		>
			{children}
		</td>
	);
}

export function IndexTableActions({ children }: ChildrenProps) {
	return (
		<IndexTableCell>
			<div className="flex justify-end gap-3 [&_a]:text-stone-400 [&_a:hover]:text-stone-100 [&_a[data-danger]]:text-rose-400/80 [&_a[data-danger]:hover]:text-rose-300">
				{children}
			</div>
		</IndexTableCell>
	);
}

export function IndexEmptyState({
	action,
	description,
	title,
}: {
	action: ReactNode;
	description: ReactNode;
	title: ReactNode;
}) {
	return (
		<section className="rounded-xl border border-dashed border-stone-700 px-6 py-16 text-center">
			<h2 className="font-serif text-2xl text-stone-100">{title}</h2>
			<p className="mt-2 text-stone-500">{description}</p>
			<div className="mt-5 [&>a]:inline-flex [&>a]:text-amber-300 [&>a:hover]:text-amber-200">
				{action}
			</div>
		</section>
	);
}
