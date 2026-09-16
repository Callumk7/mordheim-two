import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import { selectActiveImageJob } from "@/db/operations/image-selection.server";
import {
	queryWarriorPortrait,
	queryWarriorPortraitHistory,
	submitWarriorPortrait,
} from "@/db/operations/warrior-portraits.server";
import { WarriorImageSelectionSchema } from "@/db/validation/image-selection";
import { WarriorPortraitInputSchema } from "@/db/validation/warrior-portrait";

// Unauthenticated spike RPCs: protect these along with the rest of the app
// before enabling paid generation. A warrior association is not authorization.
export const getWarriorPortrait = createServerFn({ method: "GET" })
	.validator(WarriorPortraitInputSchema)
	.handler(async ({ data }) => {
		try {
			const db = getDb();
			const [job, history] = await Promise.all([
				queryWarriorPortrait(db, data.warriorId),
				queryWarriorPortraitHistory(db, data.warriorId),
			]);
			return { job: job ?? null, history };
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
					"Could not confirm portrait submission. Wait a moment before trying again.",
			} as const;
		}
	});

export const selectWarriorPortrait = createServerFn({ method: "POST" })
	.validator(WarriorImageSelectionSchema)
	.handler(async ({ data }) => {
		try {
			return await selectActiveImageJob(
				getDb(),
				"warrior",
				data.warriorId,
				data.jobId,
			);
		} catch {
			return {
				error:
					"Could not select that portrait. Choose a completed portrait for this warrior.",
			} as const;
		}
	});
