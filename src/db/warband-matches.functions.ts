import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./index.server";
import { warbandMatches } from "./schema";
import { WarbandMatchSchema } from "./warband-match";

export const listWarbandMatches = createServerFn({ method: "GET" }).handler(
	() => getDb().select().from(warbandMatches),
);

export const createWarbandMatch = createServerFn({ method: "POST" })
	.validator(WarbandMatchSchema)
	.handler(async ({ data }) => {
		await getDb().insert(warbandMatches).values(data);
	});

export const deleteWarbandMatch = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		await getDb().delete(warbandMatches).where(eq(warbandMatches.id, data.id));
	});
