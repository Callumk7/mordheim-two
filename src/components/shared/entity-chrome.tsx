import type { ReactNode } from "react";
import { Typography } from "@/components/shared/typography";
import { Button, LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EntityLink =
	| { to: "/" }
	| { to: "/events" }
	| { to: "/events/$eventId"; params: { eventId: string } }
	| { to: "/events/$eventId/delete"; params: { eventId: string } }
	| { to: "/matches" }
	| { to: "/matches/$matchId"; params: { matchId: string } }
	| { to: "/matches/$matchId/delete"; params: { matchId: string } }
	| { to: "/warbands" }
	| { to: "/warbands/$warbandId"; params: { warbandId: string } }
	| { to: "/warbands/$warbandId/delete"; params: { warbandId: string } }
	| { to: "/warriors" }
	| { to: "/warriors/$warriorId"; params: { warriorId: string } }
	| { to: "/warriors/$warriorId/delete"; params: { warriorId: string } };

export function EntityToolbar({
	actions,
	backLabel,
	backLink,
	destructiveLabel,
	destructiveLink,
}: {
	actions?: ReactNode;
	backLabel: ReactNode;
	backLink: EntityLink;
	destructiveLabel?: ReactNode;
	destructiveLink?: EntityLink;
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<LinkButton size="sm" variant="outline" {...backLink}>
				{backLabel}
			</LinkButton>
			<div className="flex flex-wrap items-center gap-2">
				{actions}
				{destructiveLink && destructiveLabel ? (
					<LinkButton size="sm" variant="destructive" {...destructiveLink}>
						{destructiveLabel}
					</LinkButton>
				) : null}
			</div>
		</div>
	);
}

export function EntityHeader({
	actions,
	className,
	contentClassName,
	description,
	descriptionClassName,
	eyebrow,
	leading,
	title,
	titleClassName,
}: {
	actions?: ReactNode;
	className?: string;
	contentClassName?: string;
	description?: ReactNode;
	descriptionClassName?: string;
	eyebrow?: ReactNode;
	leading?: ReactNode;
	title: ReactNode;
	titleClassName?: string;
}) {
	return (
		<header className={className}>
			<div className={contentClassName}>
				{leading}
				{eyebrow ? <Typography variant="eyebrow">{eyebrow}</Typography> : null}
				<Typography
					variant="pageTitle"
					className={cn("mt-2 text-foreground", titleClassName)}
				>
					{title}
				</Typography>
				{description ? (
					<Typography
						variant="supportingBody"
						className={cn("mt-2", descriptionClassName)}
					>
						{description}
					</Typography>
				) : null}
			</div>
			{actions}
		</header>
	);
}

export function NotFoundPanel({
	description,
	link,
	linkLabel,
	title,
}: {
	description: ReactNode;
	link: EntityLink;
	linkLabel: ReactNode;
	title: ReactNode;
}) {
	return (
		<section className="rounded-xl border border-border bg-card px-6 py-14 text-center">
			<Typography variant="eyebrow">Not found</Typography>
			<Typography variant="pageTitle" className="mt-3 text-foreground">
				{title}
			</Typography>
			<Typography variant="supportingBody" className="mt-2">
				{description}
			</Typography>
			<LinkButton className="mt-6" variant="link" {...link}>
				{linkLabel}
			</LinkButton>
		</section>
	);
}

export function DestructiveConfirm({
	cancelLink,
	children,
	description,
	error,
	eyebrow = "Destructive action",
	isDisabled,
	isPending,
	keepLabel,
	onConfirm,
	pendingLabel,
	submitLabel,
	title,
}: {
	cancelLink: EntityLink;
	children?: ReactNode;
	description: ReactNode;
	error?: ReactNode;
	eyebrow?: ReactNode;
	isDisabled?: boolean;
	isPending?: boolean;
	keepLabel: ReactNode;
	onConfirm: () => void | Promise<void>;
	pendingLabel: ReactNode;
	submitLabel: ReactNode;
	title: ReactNode;
}) {
	return (
		<div className="mx-auto max-w-2xl">
			<LinkButton size="sm" variant="link" {...cancelLink}>
				← Cancel
			</LinkButton>
			<section className="mt-7 rounded-xl border border-destructive/50 bg-destructive/10 p-7">
				<Typography variant="destructiveEyebrow">{eyebrow}</Typography>
				<Typography variant="pageTitle" className="mt-3 text-foreground">
					{title}
				</Typography>
				<Typography variant="supportingBody" className="mt-3 max-w-xl">
					{description}
				</Typography>
				{children}
				{error ? (
					<p className="mt-5 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{error}
					</p>
				) : null}
				<div className="mt-7 flex flex-wrap gap-3">
					<Button
						isDisabled={isDisabled || isPending}
						onPress={onConfirm}
						type="button"
						variant="destructive"
					>
						{isPending ? pendingLabel : submitLabel}
					</Button>
					<LinkButton variant="outline" {...cancelLink}>
						{keepLabel}
					</LinkButton>
				</div>
			</section>
		</div>
	);
}
