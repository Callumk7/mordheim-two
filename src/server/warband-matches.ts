import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import * as operations from "@/db/operations/warband-matches.server";
import {
	WarbandMatchDeleteInputSchema,
	WarbandMatchSchema,
} from "@/db/validation/warband-match";

export const listWarbandMatches = createServerFn({ method: "GET" }).handler(
	() => operations.listWarbandMatches(getDb()),
);

export const createWarbandMatch = createServerFn({ method: "POST" })
	.validator(WarbandMatchSchema)
	.handler(({ data }) => operations.createWarbandMatch(getDb(), data));

export const deleteWarbandMatch = createServerFn({ method: "POST" })
	.validator(WarbandMatchDeleteInputSchema)
	.handler(({ data }) => operations.deleteWarbandMatch(getDb(), data));
