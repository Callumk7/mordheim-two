import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import * as operations from "@/db/operations/warbands.server";
import {
	WarbandArchiveInputSchema,
	WarbandDeleteInputSchema,
	WarbandSchema,
	WarbandUpdateInputSchema,
} from "@/db/validation/warband";

export const listWarbands = createServerFn({ method: "GET" }).handler(() =>
	operations.listWarbands(getDb()),
);

export const createWarband = createServerFn({ method: "POST" })
	.validator(WarbandSchema)
	.handler(({ data }) => operations.createWarband(getDb(), data));

export const updateWarband = createServerFn({ method: "POST" })
	.validator(WarbandUpdateInputSchema)
	.handler(({ data }) => operations.updateWarband(getDb(), data));

export const archiveWarband = createServerFn({ method: "POST" })
	.validator(WarbandArchiveInputSchema)
	.handler(({ data }) => operations.archiveWarband(getDb(), data));

export const unarchiveWarband = createServerFn({ method: "POST" })
	.validator(WarbandArchiveInputSchema)
	.handler(({ data }) => operations.unarchiveWarband(getDb(), data));

export const deleteWarband = createServerFn({ method: "POST" })
	.validator(WarbandDeleteInputSchema)
	.handler(({ data }) => operations.deleteWarband(getDb(), data));
