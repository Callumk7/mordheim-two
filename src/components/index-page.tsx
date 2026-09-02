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
		<header className="flex flex-col justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-end">
			<div>
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
					{eyebrow}
				</p>
				<h1 className="mt-2 font-serif text-4xl font-semibold text-foreground sm:text-5xl">
					{title}
				</h1>
				<p className="mt-2 text-muted-foreground">{description}</p>
			</div>
			{action}
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
		<section className="rounded-xl border border-dashed border-input px-6 py-16 text-center">
			<h2 className="font-serif text-2xl text-foreground">{title}</h2>
			<p className="mt-2 text-muted-foreground">{description}</p>
			<div className="mt-5 [&>a]:inline-flex [&>a]:text-primary [&>a:hover]:text-primary/80">
				{action}
			</div>
		</section>
	);
}
