import {
	createFileRoute,
	useRouter,
	useRouterState,
} from "@tanstack/react-router";
import { Button, LinkButton } from "@/components/ui/button";
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
	pendingComponent: () => <p className="p-6">Loading queue jobs…</p>,
	errorComponent: QueueJobsError,
	component: QueueJobsPage,
});

function QueueJobsError() {
	const router = useRouter();
	return (
		<section className="space-y-4 p-6">
			<p role="alert">Could not load queue jobs from D1.</p>
			<Button onPress={() => void router.invalidate()}>Try again</Button>
		</section>
	);
}

function QueueJobsPage() {
	const jobs = Route.useLoaderData();
	const router = useRouter();
	const isLoading = useRouterState({ select: (state) => state.isLoading });

	return (
		<section className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div className="space-y-2">
					<h1 className="text-3xl">Queue jobs</h1>
					<p className="text-sm text-muted-foreground">
						Latest 100 D1 jobs, newest first. Completed means a JPEG is stored
						in private R2. Consumed is a historical receipt, not a generated
						image. This is not the live queue backlog.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<LinkButton to="/generated-images" variant="outline">
						View generated images
					</LinkButton>
					<LinkButton to="/queue" variant="outline">
						Send a job
					</LinkButton>
					<Button
						isDisabled={isLoading}
						onPress={() => void router.invalidate()}
					>
						{isLoading ? "Refreshing…" : "Refresh"}
					</Button>
				</div>
			</header>
			<div className="rounded-xl border border-border bg-card">
				<Table aria-label="Image generation jobs" className="min-w-5xl">
					<TableHeader>
						<TableHead isRowHeader>Job ID</TableHead>
						<TableHead>Prompt</TableHead>
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
			</div>
			<p className="text-sm text-muted-foreground">
				Showing {jobs.length} records. Refresh to query D1 again. This
				diagnostic page has no application authentication; do not submit private
				prompts. R2 remains private, but generated images are accessible through
				the unprotected gallery and app image endpoint.
			</p>
		</section>
	);
}
