import { Archive, ArchiveRestore } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

export function ArchiveAction({
	entityLabel,
	isArchived,
	name,
	onConfirm,
}: {
	entityLabel: "warband" | "warrior";
	isArchived: boolean;
	name: string;
	onConfirm: () => Promise<void>;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string>();
	const verb = isArchived ? "Unarchive" : "Archive";

	return (
		<>
			<Button size="sm" variant="outline" onPress={() => setIsOpen(true)}>
				{isArchived ? (
					<ArchiveRestore aria-hidden="true" data-icon="inline-start" />
				) : (
					<Archive aria-hidden="true" data-icon="inline-start" />
				)}
				{verb} {entityLabel}
			</Button>
			<Dialog isOpen={isOpen} onOpenChange={setIsOpen}>
				<DialogHeader>
					<DialogTitle>
						{verb} {name}?
					</DialogTitle>
					<DialogDescription>
						{isArchived
							? `This ${entityLabel} will return to new matches and event selections.`
							: `This ${entityLabel} will be hidden from new play while its campaign history remains available.`}
					</DialogDescription>
				</DialogHeader>
				{error ? <p className="text-sm text-destructive">{error}</p> : null}
				<DialogFooter>
					<DialogClose>Cancel</DialogClose>
					<Button
						isDisabled={isPending}
						onPress={async () => {
							setError(undefined);
							setIsPending(true);
							try {
								await onConfirm();
								setIsOpen(false);
							} catch (cause) {
								setError(
									cause instanceof Error
										? cause.message
										: `Unable to ${verb.toLowerCase()} ${entityLabel}.`,
								);
							} finally {
								setIsPending(false);
							}
						}}
					>
						{isPending ? "Saving…" : verb}
					</Button>
				</DialogFooter>
			</Dialog>
		</>
	);
}

export function ArchivedBanner({ archivedAt }: { archivedAt: string }) {
	return (
		<div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
			<Badge className="text-muted-foreground" variant="outline">
				Archived
			</Badge>
			<span>
				Archived on{" "}
				<time dateTime={archivedAt}>{formatArchiveDate(archivedAt)}</time>. This
				record remains available for campaign history.
			</span>
		</div>
	);
}

function formatArchiveDate(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}
