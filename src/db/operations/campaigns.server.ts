import type { z } from "zod";
import type { Database } from "@/db/index.server";
import { campaigns } from "@/db/schema";
import type { CampaignSchema } from "@/db/validation/campaign";

export function listCampaigns(db: Database) {
	return db.select().from(campaigns).orderBy(campaigns.name);
}

export async function createCampaign(
	db: Database,
	data: z.output<typeof CampaignSchema>,
) {
	await db.insert(campaigns).values(data);
}
