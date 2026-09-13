import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { type Database, getDb } from "@/db/index.server";
import { submitCompletedMatchImage } from "@/db/operations/match-images.server";
import * as operations from "@/db/operations/matches.server";
import {
	affectsMatchOutcome,
	MatchDeleteInputSchema,
	MatchParticipantsUpdateInputSchema,
	MatchSchema,
	MatchUpdateInputSchema,
	MatchWithParticipantsSchema,
} from "@/db/validation/match";

export const listMatches = createServerFn({ method: "GET" }).handler(() =>
	operations.listMatches(getDb()),
);

export const createMatch = createServerFn({ method: "POST" })
	.validator(MatchSchema)
	.handler(({ data }) => operations.createMatch(getDb(), data));

async function submitMatchImageAfterCompletion(db: Database, matchId: string) {
	try {
		await submitCompletedMatchImage(db, env.IMAGE_GENERATION_QUEUE, matchId);
	} catch {
		// Completion is durable source data. Image generation remains a best-effort
		// side effect and must not make the client retry the match mutation.
		console.error("Match image submission failed after completion.", {
			matchId,
		});
	}
}

export const createMatchWithParticipants = createServerFn({ method: "POST" })
	.validator(MatchWithParticipantsSchema)
	.handler(async ({ data }) => {
		const db = getDb();
		await operations.createMatchWithParticipants(db, data);
		if (data.match.status === "Completed") {
			await submitMatchImageAfterCompletion(db, data.match.id);
		}
	});

export const updateMatch = createServerFn({ method: "POST" })
	.validator(MatchUpdateInputSchema)
	.handler(async ({ data }) => {
		const db = getDb();
		await operations.updateMatch(db, data);
		if (affectsMatchOutcome(data.changes)) {
			await submitMatchImageAfterCompletion(db, data.id);
		}
	});

export const updateMatchWithParticipants = createServerFn({ method: "POST" })
	.validator(MatchParticipantsUpdateInputSchema)
	.handler(async ({ data }) => {
		const db = getDb();
		await operations.updateMatchWithParticipants(db, data);
		if (affectsMatchOutcome(data.changes)) {
			await submitMatchImageAfterCompletion(db, data.id);
		}
	});

export const deleteMatch = createServerFn({ method: "POST" })
	.validator(MatchDeleteInputSchema)
	.handler(({ data }) => operations.deleteMatch(getDb(), data));
