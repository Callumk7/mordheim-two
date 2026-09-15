import type { ReactNode } from "react";
import { Typography } from "@/components/shared/typography";
import { cn } from "@/lib/utils";

const variantClasses = {
	index: "rounded-xl px-6 py-16",
	dialog: "rounded-xl px-6 py-10",
	participant: "rounded-xl px-6 py-12",
	dashboard: "rounded-2xl bg-card/40 px-6 py-10",
	compact: "rounded-lg px-4 py-6",
} as const;

export function EmptyState({
	action,
	className,
	description,
	icon,
	title,
	titleAs = "h2",
	variant = "index",
}: {
	action?: ReactNode;
	className?: string;
	description?: ReactNode;
	icon?: ReactNode;
	title?: ReactNode;
	titleAs?: "h2" | "h3";
	variant?: keyof typeof variantClasses;
}) {
	return (
		<section
			className={cn(
				"border border-dashed border-input text-center",
				variantClasses[variant],
				className,
			)}
		>
			{icon}
			{title ? (
				<Typography
					as={titleAs}
					variant="sectionTitle"
					className={cn("text-foreground", icon && "mt-3")}
				>
					{title}
				</Typography>
			) : null}
			{description ? (
				<Typography
					variant="supportingBody"
					className={cn(
						(title || icon) && "mt-2",
						variant === "dashboard" && "mx-auto mt-1 max-w-md",
					)}
				>
					{description}
				</Typography>
			) : null}
			{action ? (
				<div
					className={cn(
						"mt-5",
						variant === "index" &&
							"[&>a]:inline-flex [&>a]:text-primary [&>a:hover]:text-primary/80",
					)}
				>
					{action}
				</div>
			) : null}
		</section>
	);
}
