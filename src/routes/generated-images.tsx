import {
	createFileRoute,
	useRouter,
	useRouterState,
} from "@tanstack/react-router";
import { useState } from "react";
import { AdminPageHeader } from "@/components/shared/admin-page-header";
import { Page, PageError, PagePending } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
			<AdminPageHeader
				currentPage="generated-images"
				title="Generated images"
				description={
					<>
						Latest 100 actively selected images, newest completion first. Select
						an image to enlarge it. Refresh to check for new results.
					</>
				}
				isRefreshing={isLoading}
				onRefresh={() => {
					setRefreshKey((key) => key + 1);
					void router.invalidate();
				}}
			/>
			{images.length === 0 ? (
				<Card>
					<CardContent>
						No active images yet. Queued, failed, generic, and non-selected
						historical jobs are not shown here.
					</CardContent>
				</Card>
			) : (
				<ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{images.map((image) => {
						const caption = image.refinedPrompt ?? image.prompt;
						return (
							<li key={`${image.id}:${refreshKey}`} className="min-w-0">
								<Card size="sm">
									<CardContent className="space-y-3">
										<DialogTrigger>
											<Button
												variant="ghost"
												className="h-auto w-full rounded-xl p-0"
												aria-label={`Enlarge image: ${caption}`}
											>
												<GeneratedImage id={image.id} prompt={caption} />
											</Button>
											<Dialog className="max-h-[90dvh]" size="lg">
												<DialogTitle className="pr-8">
													Generated image
												</DialogTitle>
												<GeneratedImage
													id={image.id}
													prompt={caption}
													enlarged
												/>
												<p className="break-words whitespace-pre-wrap">
													{caption}
												</p>
											</Dialog>
										</DialogTrigger>
										<p className="text-sm break-words whitespace-pre-wrap">
											{caption}
										</p>
										<p className="text-xs text-muted-foreground">
											Completed (UTC): {image.completedAt ?? "Unknown"}
										</p>
									</CardContent>
								</Card>
							</li>
						);
					})}
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
