import {
	createFileRoute,
	useRouter,
	useRouterState,
} from "@tanstack/react-router";
import { useState } from "react";
import { Page, PageError, PagePending } from "@/components/shared/page";
import { Typography } from "@/components/shared/typography";
import { Button, LinkButton } from "@/components/ui/button";
import { Dialog, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { listGeneratedImages } from "@/server/generated-images";

export const Route = createFileRoute("/generated-images")({
	loader: () => listGeneratedImages(),
	pendingComponent: () => (
		<PagePending width="wide">Loading generated images…</PagePending>
	),
	errorComponent: GeneratedImagesError,
	component: GeneratedImagesPage,
});

function GeneratedImagesError() {
	const router = useRouter();
	return (
		<PageError className="space-y-4" width="wide">
			<p>Could not load generated images from D1.</p>
			<Button onPress={() => void router.invalidate()}>Try again</Button>
		</PageError>
	);
}

function GeneratedImage({
	id,
	prompt,
	enlarged = false,
}: {
	id: string;
	prompt: string;
	enlarged?: boolean;
}) {
	const [status, setStatus] = useState<"loading" | "loaded" | "error">(
		"loading",
	);
	return (
		<span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-muted">
			{status !== "error" && (
				<img
					src={`/api/generated-images/${encodeURIComponent(id)}`}
					alt={prompt}
					loading={enlarged ? "eager" : "lazy"}
					className="absolute inset-0 size-full object-contain"
					onLoad={() => setStatus("loaded")}
					onError={() => setStatus("error")}
				/>
			)}
			{status !== "loaded" && (
				<span className="relative px-4 text-center text-sm whitespace-normal text-muted-foreground">
					{status === "error"
						? "Image unavailable. Refresh to try again."
						: "Loading image…"}
				</span>
			)}
		</span>
	);
}

function GeneratedImagesPage() {
	const images = Route.useLoaderData();
	const router = useRouter();
	const isLoading = useRouterState({ select: (state) => state.isLoading });
	const [refreshKey, setRefreshKey] = useState(0);

	return (
		<Page className="flex flex-col gap-6" width="wide">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div className="space-y-2">
					<Typography variant="pageTitle">Generated images</Typography>
					<Typography variant="supportingBody">
						Latest 100 completed D1 jobs, newest completion first. Select an
						image to enlarge it. Refresh to check for new results.
					</Typography>
				</div>
				<div className="flex flex-wrap gap-2">
					<LinkButton to="/queue" variant="outline">
						Send a job
					</LinkButton>
					<LinkButton to="/queue-jobs" variant="outline">
						View D1 jobs
					</LinkButton>
					<LinkButton to="/settings" variant="outline">
						Image instructions
					</LinkButton>
					<Button
						isDisabled={isLoading}
						onPress={() => {
							setRefreshKey((key) => key + 1);
							void router.invalidate();
						}}
					>
						{isLoading ? "Refreshing…" : "Refresh"}
					</Button>
				</div>
			</header>
			{images.length === 0 ? (
				<p className="rounded-xl border border-border bg-card p-6">
					No completed images yet. Queued, failed and historical consumed jobs
					are not shown here.
				</p>
			) : (
				<ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{images.map((image) => (
						<li
							key={`${image.id}:${refreshKey}`}
							className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-4"
						>
							<DialogTrigger>
								<Button
									variant="ghost"
									className="h-auto w-full rounded-xl p-0"
									aria-label={`Enlarge image: ${image.prompt}`}
								>
									<GeneratedImage id={image.id} prompt={image.prompt} />
								</Button>
								<Dialog className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
									<DialogTitle className="pr-8">Generated image</DialogTitle>
									<GeneratedImage
										id={image.id}
										prompt={image.prompt}
										enlarged
									/>
									<p className="break-words whitespace-pre-wrap">
										{image.prompt}
									</p>
								</Dialog>
							</DialogTrigger>
							<p className="text-sm break-words whitespace-pre-wrap">
								{image.prompt}
							</p>
							<p className="text-xs text-muted-foreground">
								Completed (UTC): {image.completedAt ?? "Unknown"}
							</p>
						</li>
					))}
				</ul>
			)}
			<p className="text-sm text-muted-foreground">
				Showing {images.length} results. The bucket is private, but this spike’s
				gallery and image endpoint have no authentication. Do not use private
				prompts or images. Local storage is separate from deployed storage.
			</p>
		</Page>
	);
}
