import type { ReactNode } from "react";
import { Typography } from "@/components/shared/typography";

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
				<Typography variant="pageTitle" className="mt-2 text-foreground">
					{title}
				</Typography>
				<Typography variant="supportingBody" className="mt-2">
					{description}
				</Typography>
			</div>
			{action}
		</header>
	);
}
