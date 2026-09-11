import { Check, Play } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Match } from "@/db/validation/match";

export function MatchStatusActions({
	status,
	onOpenCompletion,
	onStatusChange,
}: {
	status: Match["status"];
	onOpenCompletion: () => void;
	onStatusChange: (status: Match["status"]) => Promise<void>;
}) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string>();

	async function changeStatus(nextStatus: Match["status"]) {
		setError(undefined);
		setIsSubmitting(true);
		try {
			await onStatusChange(nextStatus);
			if (nextStatus === "Completed") onOpenCompletion();
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "Unable to update the match.",
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<>
			{status === "Scheduled" ? (
				<Button
					isDisabled={isSubmitting}
					onPress={() => void changeStatus("InProgress")}
				>
					<Play aria-hidden="true" data-icon="inline-start" />
					{isSubmitting ? "Starting…" : "Start match"}
				</Button>
			) : status === "InProgress" ? (
				<Button
					isDisabled={isSubmitting}
					onPress={() => void changeStatus("Completed")}
				>
					<Check aria-hidden="true" data-icon="inline-start" />
					{isSubmitting ? "Completing…" : "Complete match"}
				</Button>
			) : (
				<Button onPress={onOpenCompletion} variant="outline">
					Review match events
				</Button>
			)}
			{error ? (
				<p className="basis-full text-sm text-destructive" role="alert">
					{error}
				</p>
			) : null}
		</>
	);
}
