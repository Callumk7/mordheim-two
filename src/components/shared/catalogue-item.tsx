import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function CatalogueItem({
	children,
	className,
	summary,
}: {
	children: ReactNode;
	className?: string;
	summary: ReactNode;
}) {
	return (
		<Card className={cn("gap-0 py-0", className)} size="sm">
			<details>
				<summary className="cursor-pointer px-(--card-spacing) py-4 focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring">
					{summary}
				</summary>
				<div className="grid gap-5 border-t border-border px-(--card-spacing) py-5 text-sm">
					{children}
				</div>
			</details>
		</Card>
	);
}
