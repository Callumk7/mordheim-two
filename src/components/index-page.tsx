import type { ReactNode } from "react";

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
