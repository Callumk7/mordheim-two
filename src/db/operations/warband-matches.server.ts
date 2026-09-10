import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { Database } from "@/db/index.server";
import { warbandMatches } from "@/db/schema";
import type {
	WarbandMatchDeleteInputSchema,
	WarbandMatchSchema,
} from "@/db/validation/warband-match";

export function listWarbandMatches(db: Database) {
	return db.select().from(warbandMatches);
}

export async function createWarbandMatch(
	db: Database,
	data: z.output<typeof WarbandMatchSchema>,
) {
	await db.insert(warbandMatches).values(data);
}

export async function deleteWarbandMatch(
	db: Database,
	data: z.output<typeof WarbandMatchDeleteInputSchema>,
) {
	await db.delete(warbandMatches).where(eq(warbandMatches.id, data.id));
}
