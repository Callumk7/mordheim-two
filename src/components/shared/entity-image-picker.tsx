import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
	type GeneratedImageJob,
	GeneratedImageStatus,
} from "@/components/shared/generated-image-status";
import { isActiveImageJobStatus } from "@/components/shared/use-image-generation-polling";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

export function EntityImagePicker({
	active,
	alt,
	emptyDescription,
	history,
	label,
	onGenerate,
	onSelect,
}: {
	active: GeneratedImageJob | null;
	alt: string;
	emptyDescription: string;
	history: GeneratedImageJob[];
	label: string;
	onGenerate: () => Promise<{ error?: string }>;
	onSelect: (jobId: string) => Promise<{ error?: string; jobId?: string }>;
}) {
	const router = useRouter();
	const [isGenerating, setIsGenerating] = useState(false);
	const [selectingId, setSelectingId] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	const displayed =
		active ?? history.find((job) => isActiveImageJobStatus(job.status));

	const generate = async () => {
		setIsGenerating(true);
		setMessage(null);
		try {
			const result = await onGenerate();
			if (result.error) setMessage(result.error);
			else await router.invalidate({ sync: true });
		} catch {
			setMessage(
				"Could not confirm image submission. Wait a moment before trying again.",
			);
		} finally {
			setIsGenerating(false);
		}
	};

	const select = async (jobId: string) => {
		setSelectingId(jobId);
		setMessage(null);
		try {
			const result = await onSelect(jobId);
			if (result.error) setMessage(result.error);
			else await router.invalidate({ sync: true });
		} catch {
			setMessage("Could not select that image. Refresh and try again.");
		} finally {
			setSelectingId(null);
		}
	};

	return (
		<div className="space-y-4">
			{displayed ? (
				<GeneratedImageStatus alt={alt} job={displayed} label={label} />
			) : (
				<p className="text-sm text-muted-foreground">{emptyDescription}</p>
			)}
			<div className="flex flex-wrap gap-2">
				<Button isDisabled={isGenerating} onPress={generate}>
					{isGenerating
						? "Submitting…"
						: history.length > 0
							? "Generate another"
							: `Generate ${label.toLowerCase()}`}
				</Button>
				{history.length > 0 ? (
					<DialogTrigger>
						<Button variant="outline">Choose image</Button>
						<Dialog size="lg">
							<DialogTitle>Choose {label.toLowerCase()}</DialogTitle>
							<DialogDescription>
								Completed images can be selected. Work in progress and failed
								attempts remain in history but cannot be selected.
							</DialogDescription>
							<ul className="grid gap-4 sm:grid-cols-2">
								{history.map((job) => {
									const isActive = job.jobId === active?.jobId;
									return (
										<li
											className="space-y-2 rounded-xl border border-border p-3"
											key={job.jobId}
										>
											<GeneratedImageStatus
												alt={`${alt} generation option`}
												job={job}
												label={label}
											/>
											{job.status === "completed" ? (
												<Button
													className="w-full"
													isDisabled={isActive || selectingId !== null}
													onPress={() => select(job.jobId)}
													variant={isActive ? "secondary" : "outline"}
												>
													{isActive
														? "Currently selected"
														: selectingId === job.jobId
															? "Selecting…"
															: "Use this image"}
												</Button>
											) : (
												<p
													className="text-xs text-muted-foreground"
													aria-disabled="true"
												>
													Not selectable
												</p>
											)}
										</li>
									);
								})}
							</ul>
						</Dialog>
					</DialogTrigger>
				) : null}
			</div>
			{message ? <p role="alert">{message}</p> : null}
		</div>
	);
}
