import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import * as operations from "@/db/operations/matches.server";
import {
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

export const createMatchWithParticipants = createServerFn({ method: "POST" })
	.validator(MatchWithParticipantsSchema)
	.handler(({ data }) => operations.createMatchWithParticipants(getDb(), data));

export const updateMatch = createServerFn({ method: "POST" })
	.validator(MatchUpdateInputSchema)
	.handler(({ data }) => operations.updateMatch(getDb(), data));

export const updateMatchWithParticipants = createServerFn({ method: "POST" })
	.validator(MatchParticipantsUpdateInputSchema)
	.handler(({ data }) => operations.updateMatchWithParticipants(getDb(), data));

export const deleteMatch = createServerFn({ method: "POST" })
	.validator(MatchDeleteInputSchema)
	.handler(({ data }) => operations.deleteMatch(getDb(), data));
