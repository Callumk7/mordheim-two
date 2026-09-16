import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { IndexPage, IndexPageHeader } from "@/components/shared/index-page";
import { Page } from "@/components/shared/page";
import { Typography } from "@/components/shared/typography";
import { Button, LinkButton } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getCollections } from "@/db-collections";
import { createCampaignTransaction } from "@/db-collections/mutations/campaigns";
import { useCampaigns } from "@/db-collections/queries";

export const Route = createFileRoute("/")({
	ssr: false,
	loader: async ({ context }) => {
		await getCollections(context.dbClient).campaigns.preload();
		return null;
	},
	component: Home,
});

function Home() {
	const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const campaigns = useCampaigns(dbClient);
	const navigate = useNavigate();

	return (
		<Page padding="loose">
			<IndexPage>
				<IndexPageHeader
					action={
						<Button onPress={() => setIsNewCampaignOpen(true)}>
							New campaign
						</Button>
					}
					description="Choose a campaign to continue, or start a new season in a blank ledger."
					title="Campaigns"
				/>

				{campaigns.length ? (
					<ul className="grid gap-3">
						{campaigns.map((campaign) => (
							<li key={campaign.id}>
								<LinkButton
									className="h-auto w-full justify-between rounded-2xl px-5 py-4"
									params={{ campaignId: campaign.id }}
									to="/campaigns/$campaignId/warbands"
									variant="outline"
								>
									<span className="text-left">
										<Typography
											as="span"
											className="block text-foreground"
											variant="sectionTitle"
										>
											{campaign.name}
										</Typography>
									</span>
									<span>Enter →</span>
								</LinkButton>
							</li>
						))}
					</ul>
				) : (
					<EmptyState
						action={
							<Button variant="link" onPress={() => setIsNewCampaignOpen(true)}>
								Create a campaign →
							</Button>
						}
						description="Start a new campaign to track warbands, matches, and events."
						title="No campaigns yet"
					/>
				)}

				<Dialog isOpen={isNewCampaignOpen} onOpenChange={setIsNewCampaignOpen}>
					<DialogHeader>
						<DialogTitle>New campaign</DialogTitle>
						<DialogDescription>
							Name the season. You can add warbands after you enter it.
						</DialogDescription>
					</DialogHeader>
					<CampaignNameForm
						onSubmit={async (name) => {
							const { id, transaction } = createCampaignTransaction(
								collections,
								{ name },
							);
							await transaction.isPersisted.promise;
							setIsNewCampaignOpen(false);
							await navigate({
								to: "/campaigns/$campaignId/warbands",
								params: { campaignId: id },
							});
						}}
					/>
				</Dialog>
			</IndexPage>
		</Page>
	);
}

function CampaignNameForm({
	onSubmit,
}: {
	onSubmit: (name: string) => Promise<void>;
}) {
	const [name, setName] = useState("");
	const [error, setError] = useState<string>();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const id = useId();

	return (
		<form
			className="grid gap-6"
			onSubmit={async (event) => {
				event.preventDefault();
				setError(undefined);
				setIsSubmitting(true);
				try {
					await onSubmit(name);
				} catch (cause) {
					setError(
						cause instanceof Error
							? cause.message
							: "Unable to create campaign.",
					);
				} finally {
					setIsSubmitting(false);
				}
			}}
		>
			<Field>
				<FieldLabel htmlFor={id}>Campaign name</FieldLabel>
				<Input
					id={id}
					name="name"
					onChange={(event) => setName(event.target.value)}
					required
					value={name}
				/>
			</Field>
			<FieldError>{error}</FieldError>
			<div>
				<Button isDisabled={isSubmitting || !name.trim()} type="submit">
					{isSubmitting ? "Creating…" : "Create campaign"}
				</Button>
			</div>
		</form>
	);
}
