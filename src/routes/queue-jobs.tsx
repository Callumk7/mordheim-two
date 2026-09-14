import {
	createFileRoute,
	useRouter,
	useRouterState,
} from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/shared/admin-page-header";
import { Page, PageError, PagePending } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { listQueueJobs } from "@/server/queue-jobs";

export const Route = createFileRoute("/queue-jobs")({
	loader: () => listQueueJobs(),
	pendingComponent: () => (
		<PagePending width="wide">Loading queue jobs…</PagePending>
	),
	errorComponent: QueueJobsError,
	component: QueueJobsPage,
});

function QueueJobsError() {
	const router = useRouter();
	return (
		<PageError className="space-y-4" width="wide">
			<p>Could not load queue jobs from D1.</p>
			<Button onPress={() => void router.invalidate()}>Try again</Button>
		</PageError>
	);
}

function QueueJobsPage() {
	const jobs = Route.useLoaderData();
	const router = useRouter();
	const isLoading = useRouterState({ select: (state) => state.isLoading });

	return (
		<Page className="flex flex-col gap-6" width="wide">
			<AdminPageHeader
				currentPage="queue-jobs"
				title="Queue jobs"
				description={
					<>
						Latest 100 D1 jobs, newest first. Completed means a JPEG is stored
						in private R2. Consumed is a historical receipt, not a generated
						image. This is not the live queue backlog.
					</>
				}
				isRefreshing={isLoading}
				onRefresh={() => void router.invalidate()}
			/>
			<Card className="py-0">
				<Table aria-label="Image generation jobs" className="min-w-5xl">
					<TableHeader>
						<TableHead isRowHeader>Job ID</TableHead>
						<TableHead>Prompt</TableHead>
						<TableHead>Refined prompt</TableHead>
						<TableHead>Model</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Error</TableHead>
						<TableHead>Private result</TableHead>
						<TableHead>Completed (UTC)</TableHead>
						<TableHead>Created (UTC)</TableHead>
						<TableHead>Updated (UTC)</TableHead>
					</TableHeader>
					<TableBody items={jobs} renderEmptyState={() => "No queue jobs yet."}>
						{(job) => (
							<TableRow id={job.id}>
								<TableCell className="max-w-48 font-mono text-xs break-all whitespace-normal">
									{job.id}
								</TableCell>
								<TableCell className="min-w-64 max-w-md break-words whitespace-pre-wrap">
									{job.prompt}
								</TableCell>
								<TableCell className="min-w-64 max-w-md break-words whitespace-pre-wrap">
									{job.refinedPrompt ?? "—"}
								</TableCell>
								<TableCell>{job.model}</TableCell>
								<TableCell>{job.status}</TableCell>
								<TableCell className="max-w-xs break-words whitespace-pre-wrap">
									{job.error ?? "—"}
								</TableCell>
								<TableCell className="max-w-xs break-all whitespace-normal">
									{job.resultKey ? (
										<div className="space-y-1">
											<code className="text-xs">{job.resultKey}</code>
											<p className="text-xs text-muted-foreground">
												{job.resultMimeType} · {job.resultBytes} bytes ·{" "}
												{job.resultModel}
											</p>
										</div>
									) : (
										"—"
									)}
								</TableCell>
								<TableCell>{job.completedAt ?? "—"}</TableCell>
								<TableCell>{job.createdAt}</TableCell>
								<TableCell>{job.updatedAt}</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</Card>
			<p className="text-sm text-muted-foreground">
				Showing {jobs.length} records. Refresh to query D1 again. This
				diagnostic page has no application authentication; do not submit private
				prompts. R2 remains private, but generated images are accessible through
				the unprotected gallery and app image endpoint.
			</p>
		</Page>
	);
}
