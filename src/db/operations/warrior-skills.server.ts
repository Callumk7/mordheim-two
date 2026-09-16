import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { Database } from "@/db/index.server";
import { warriorSkills } from "@/db/schema";
import type {
	WarriorSkillDeleteInputSchema,
	WarriorSkillSchema,
} from "@/db/validation/warrior-skill";

export function listWarriorSkills(db: Database) {
	return db.select().from(warriorSkills);
}

export async function createWarriorSkill(
	db: Database,
	data: z.output<typeof WarriorSkillSchema>,
) {
	await db.insert(warriorSkills).values(data);
}

export async function deleteWarriorSkill(
	db: Database,
	data: z.output<typeof WarriorSkillDeleteInputSchema>,
) {
	await db.delete(warriorSkills).where(eq(warriorSkills.id, data.id));
}
