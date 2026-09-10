import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import * as operations from "@/db/operations/warriors.server";
import {
	WarriorDeleteInputSchema,
	WarriorSchema,
	WarriorUpdateInputSchema,
} from "@/db/validation/warrior";

export const listWarriors = createServerFn({ method: "GET" }).handler(() =>
	operations.listWarriors(getDb()),
);

export const createWarrior = createServerFn({ method: "POST" })
	.validator(WarriorSchema)
	.handler(({ data }) => operations.createWarrior(getDb(), data));

export const updateWarrior = createServerFn({ method: "POST" })
	.validator(WarriorUpdateInputSchema)
	.handler(({ data }) => operations.updateWarrior(getDb(), data));

export const deleteWarrior = createServerFn({ method: "POST" })
	.validator(WarriorDeleteInputSchema)
	.handler(({ data }) => operations.deleteWarrior(getDb(), data));
