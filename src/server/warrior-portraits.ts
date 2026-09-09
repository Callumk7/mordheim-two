import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import { WarriorPortraitInputSchema } from "@/db/validation/warrior-portrait";
import {
	queryWarriorPortrait,
	submitWarriorPortrait,
} from "@/server/warrior-portraits.server";

// Unauthenticated spike RPCs: protect these along with the rest of the app
// before enabling paid generation. A warrior association is not authorization.
export const getWarriorPortrait = createServerFn({ method: "GET" })
	.validator(WarriorPortraitInputSchema)
	.handler(async ({ data }) => {
		try {
			return {
				job: (await queryWarriorPortrait(getDb(), data.warriorId)) ?? null,
			};
		} catch {
			return {
				error:
					"Could not load portrait status. Refresh this page to try again.",
			} as const;
		}
	});

export const createWarriorPortrait = createServerFn({ method: "POST" })
	.validator(WarriorPortraitInputSchema)
	.handler(async ({ data }) => {
		try {
			return await submitWarriorPortrait(
				getDb(),
				env.IMAGE_GENERATION_QUEUE,
				data.warriorId,
			);
		} catch {
			return {
				error:
					"Could not confirm portrait submission. Refresh this page before trying again; a job may already exist.",
			} as const;
		}
	});
