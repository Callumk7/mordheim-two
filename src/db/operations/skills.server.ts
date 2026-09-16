import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { Database } from "@/db/index.server";
import { type Clock, systemClock } from "@/db/operations/clock";
import { skills } from "@/db/schema";
import type {
	SkillDeleteInputSchema,
	SkillSchema,
	SkillUpdateInputSchema,
} from "@/db/validation/skill";

export function listSkills(db: Database) {
	return db.select().from(skills).orderBy(skills.name);
}

export async function createSkill(
	db: Database,
	data: z.output<typeof SkillSchema>,
) {
	await db.insert(skills).values(data);
}

export async function updateSkill(
	db: Database,
	data: z.output<typeof SkillUpdateInputSchema>,
	clock: Clock = systemClock,
) {
	if (Object.keys(data.changes).length === 0) return;
	await db
		.update(skills)
		.set({ ...data.changes, updatedAt: clock() })
		.where(eq(skills.id, data.id));
}

export async function deleteSkill(
	db: Database,
	data: z.output<typeof SkillDeleteInputSchema>,
) {
	await db.delete(skills).where(eq(skills.id, data.id));
}
