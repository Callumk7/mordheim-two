import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import * as operations from "@/db/operations/campaigns.server";
import { CampaignSchema } from "@/db/validation/campaign";

export const listCampaigns = createServerFn({ method: "GET" }).handler(() =>
	operations.listCampaigns(getDb()),
);

export const createCampaign = createServerFn({ method: "POST" })
	.validator(CampaignSchema)
	.handler(({ data }) => operations.createCampaign(getDb(), data));
