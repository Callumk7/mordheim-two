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
	title,
}: {
	action: ReactNode;
	description: ReactNode;
	title: ReactNode;
}) {
	return (
		<header className="flex flex-col justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-end">
			<div>
				<h1 className="mt-2 font-mordheim text-4xl text-foreground sm:text-5xl">
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
			<h2 className="font-mordheim text-2xl text-foreground">{title}</h2>
			<p className="mt-2 text-muted-foreground">{description}</p>
			<div className="mt-5 [&>a]:inline-flex [&>a]:text-primary [&>a:hover]:text-primary/80">
				{action}
			</div>
		</section>
	);
}
