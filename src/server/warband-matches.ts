import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/index.server";
import { warbandMatches } from "@/db/schema";
import {
	WarbandMatchDeleteInputSchema,
	WarbandMatchSchema,
} from "@/db/validation/warband-match";

export const listWarbandMatches = createServerFn({ method: "GET" }).handler(
	() => getDb().select().from(warbandMatches),
);

export const createWarbandMatch = createServerFn({ method: "POST" })
	.validator(WarbandMatchSchema)
	.handler(async ({ data }) => {
		await getDb().insert(warbandMatches).values(data);
	});

export const deleteWarbandMatch = createServerFn({ method: "POST" })
	.validator(WarbandMatchDeleteInputSchema)
	.handler(async ({ data }) => {
		await getDb().delete(warbandMatches).where(eq(warbandMatches.id, data.id));
	});
