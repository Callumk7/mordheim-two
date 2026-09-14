import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

const typographyVariants = cva("", {
	variants: {
		variant: {
			display: "font-mordheim text-5xl sm:text-7xl",
			pageTitle: "font-mordheim text-4xl sm:text-5xl",
			sectionTitle: "font-mordheim text-2xl",
			eyebrow: "text-xs font-semibold uppercase tracking-[0.28em] text-primary",
			destructiveEyebrow:
				"text-xs font-semibold uppercase tracking-[0.28em] text-destructive",
			supportingBody: "text-muted-foreground text-sm",
			displayBody: "text-lg leading-8",
		},
	},
});

export type TypographyVariant = NonNullable<
	VariantProps<typeof typographyVariants>["variant"]
>;

const defaultElements = {
	display: "h1",
	pageTitle: "h1",
	sectionTitle: "h2",
	eyebrow: "p",
	destructiveEyebrow: "p",
	supportingBody: "p",
	displayBody: "p",
} as const satisfies Record<TypographyVariant, "h1" | "h2" | "p">;

export type TypographyElement = "h1" | "h2" | "h3" | "p" | "span";

export type TypographyProps = {
	as?: TypographyElement;
	variant: TypographyVariant;
} & ComponentPropsWithoutRef<"p">;

export function Typography({
	as,
	className,
	variant,
	...props
}: TypographyProps) {
	const Comp = as ?? defaultElements[variant];
	return (
		<Comp
			className={cn(typographyVariants({ variant }), className)}
			{...props}
		/>
	);
}
