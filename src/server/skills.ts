import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import * as operations from "@/db/operations/skills.server";
import {
	SkillDeleteInputSchema,
	SkillSchema,
	SkillUpdateInputSchema,
} from "@/db/validation/skill";

export const listSkills = createServerFn({ method: "GET" }).handler(() =>
	operations.listSkills(getDb()),
);

export const createSkill = createServerFn({ method: "POST" })
	.validator(SkillSchema)
	.handler(({ data }) => operations.createSkill(getDb(), data));

export const updateSkill = createServerFn({ method: "POST" })
	.validator(SkillUpdateInputSchema)
	.handler(({ data }) => operations.updateSkill(getDb(), data));

export const deleteSkill = createServerFn({ method: "POST" })
	.validator(SkillDeleteInputSchema)
	.handler(({ data }) => operations.deleteSkill(getDb(), data));
