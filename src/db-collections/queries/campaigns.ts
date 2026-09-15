import { type DbClient, eq, useLiveQuery } from "@tanstack/react-db";
import { getCollections } from "..";

export function useCampaigns(dbClient: DbClient) {
	const { campaigns } = getCollections(dbClient);
	const { data } = useLiveQuery({
		query: (q) =>
			q.from({ campaign: campaigns }).orderBy(({ campaign }) => campaign.name),
	});
	return data;
}

export function useCampaign(dbClient: DbClient, campaignId: string) {
	const { campaigns } = getCollections(dbClient);
	const { data } = useLiveQuery({
		query: (q) =>
			q
				.from({ campaign: campaigns })
				.where(({ campaign }) => eq(campaign.id, campaignId)),
	});
	return data[0];
}
