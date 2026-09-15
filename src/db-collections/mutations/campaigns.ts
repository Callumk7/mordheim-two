import { safeRandomUUID } from "@tanstack/react-db";
import type { Campaign } from "@/db/validation/campaign";
import type { AppCollections } from "..";

type NewCampaign = Omit<Campaign, "id" | "createdAt" | "updatedAt">;

export function createCampaignTransaction(
	collections: AppCollections,
	values: NewCampaign,
) {
	const now = new Date().toISOString();
	const id = safeRandomUUID();
	return {
		id,
		transaction: collections.campaigns.insert({
			id,
			...values,
			createdAt: now,
			updatedAt: now,
		}),
	};
}
