import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ImageGenerationSettingsForm } from "@/components/image-generation-settings-form";
import { AdminPageHeader } from "@/components/shared/admin-page-header";
import { Page, PageError, PagePending } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import {
	getImageGenerationInstructions,
	updateImageGenerationInstructions,
} from "@/server/image-generation";

export const Route = createFileRoute("/settings")({
	loader: () => getImageGenerationInstructions(),
	pendingComponent: () => (
		<PagePending width="narrow">Loading settings…</PagePending>
	),
	errorComponent: SettingsError,
	component: SettingsPage,
});

function SettingsError() {
	const router = useRouter();
	return (
		<PageError className="space-y-4" width="narrow">
			<p>Could not load image-generation settings from D1.</p>
			<Button onPress={() => void router.invalidate()}>Try again</Button>
		</PageError>
	);
}

function SettingsPage() {
	const settings = Route.useLoaderData();

	return (
		<Page className="flex flex-col gap-6" width="narrow">
			<AdminPageHeader
				currentPage="settings"
				title="Settings"
				description={
					<>
						Configure the base instructions applied when the image-generation
						consumer refines a job prompt. Saved values replace the default John
						Blanche brief for later jobs. This page currently has no application
						authentication.
					</>
				}
			/>
			<ImageGenerationSettingsForm
				key={`${settings.isCustom}:${settings.instructions}`}
				initialInstructions={settings.instructions}
				isCustom={settings.isCustom}
				onSave={async (instructions) => {
					await updateImageGenerationInstructions({ data: { instructions } });
				}}
			/>
		</Page>
	);
}
