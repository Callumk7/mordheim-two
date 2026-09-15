import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { BasicIndex, collectionOptions } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { CampaignSchema } from "@/db/validation/campaign";
import { createCampaign, listCampaigns } from "@/server/campaigns";

export const campaignsCollectionOptions = collectionOptions(
	"campaigns",
	(client) =>
		queryCollectionOptions({
			id: "campaigns",
			autoIndex: "eager",
			defaultIndexType: BasicIndex,
			queryKey: ["campaigns"],
			queryClient: client.requireDependency<QueryClient>("queryClient"),
			queryFn: () => listCampaigns(),
			getKey: (campaign) => campaign.id,
			schema: CampaignSchema,
			onInsert: async ({ transaction }) => {
				await Promise.all(
					transaction.mutations.map((mutation) =>
						createCampaign({
							data: CampaignSchema.parse(mutation.modified),
						}),
					),
				);
			},
		}),
);
