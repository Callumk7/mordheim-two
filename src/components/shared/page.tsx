import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Campaign page landmark. Default width and padding match collection indexes.
 *
 * Width:
 * - `default` — `max-w-6xl` (lists, home, stats, equipment)
 * - `narrow` — `max-w-3xl` (settings; detail-style forms)
 * - `form` — `max-w-2xl` (queue playground; delete/void columns)
 * - `wide` — `max-w-7xl` (`/queue-jobs` table and `/generated-images` gallery)
 *
 * Padding:
 * - `default` — `py-10`
 * - `loose` — `py-16 sm:py-24` (home and default 404)
 *
 * `/queue-jobs` and `/generated-images` keep `width="wide"` so the jobs table
 * (`min-w-5xl`) and four-column gallery stay at `max-w-7xl` instead of shrinking
 * to the campaign `max-w-6xl`.
 */
const pageVariants = cva("mx-auto w-full px-4 sm:px-8", {
	variants: {
		width: {
			default: "max-w-6xl",
			narrow: "max-w-3xl",
			form: "max-w-2xl",
			wide: "max-w-7xl",
		},
		padding: {
			default: "py-10",
			loose: "py-16 sm:py-24",
		},
	},
	defaultVariants: {
		width: "default",
		padding: "default",
	},
});

export type PageProps = ComponentProps<"main"> &
	VariantProps<typeof pageVariants>;

export function Page({ className, padding, width, ...props }: PageProps) {
	return (
		<main
			className={cn(pageVariants({ padding, width }), className)}
			{...props}
		/>
	);
}

export function PagePending({ children, ...props }: PageProps) {
	return (
		<Page {...props}>
			<output>{children}</output>
		</Page>
	);
}

export function PageError({ children, ...props }: PageProps) {
	return (
		<Page role="alert" {...props}>
			{children}
		</Page>
	);
}
