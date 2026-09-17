import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import * as operations from "@/db/operations/warrior-skills.server";
import {
	WarriorSkillDeleteInputSchema,
	WarriorSkillSchema,
} from "@/db/validation/warrior-skill";

export const listWarriorSkills = createServerFn({ method: "GET" }).handler(() =>
	operations.listWarriorSkills(getDb()),
);

export const createWarriorSkill = createServerFn({ method: "POST" })
	.validator(WarriorSkillSchema)
	.handler(({ data }) => operations.createWarriorSkill(getDb(), data));

export const deleteWarriorSkill = createServerFn({ method: "POST" })
	.validator(WarriorSkillDeleteInputSchema)
	.handler(({ data }) => operations.deleteWarriorSkill(getDb(), data));
