import type { ReactNode } from "react";
import { campaignTypography } from "@/components/shared/typography";

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
				<h1 className={`${campaignTypography.pageTitle} mt-2 text-foreground`}>
					{title}
				</h1>
				<p className={`${campaignTypography.supportingBody} mt-2`}>
					{description}
				</p>
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
			<h2 className={`${campaignTypography.sectionTitle} text-foreground`}>
				{title}
			</h2>
			<p className={`${campaignTypography.supportingBody} mt-2`}>
				{description}
			</p>
			<div className="mt-5 [&>a]:inline-flex [&>a]:text-primary [&>a:hover]:text-primary/80">
				{action}
			</div>
		</section>
	);
}
