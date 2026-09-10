import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import * as operations from "@/db/operations/warrior-equipment.server";
import {
	WarriorEquipmentDeleteInputSchema,
	WarriorEquipmentSchema,
} from "@/db/validation/warrior-equipment";

export const listWarriorEquipment = createServerFn({ method: "GET" }).handler(
	() => operations.listWarriorEquipment(getDb()),
);

export const createWarriorEquipment = createServerFn({ method: "POST" })
	.validator(WarriorEquipmentSchema)
	.handler(({ data }) => operations.createWarriorEquipment(getDb(), data));

export const deleteWarriorEquipment = createServerFn({ method: "POST" })
	.validator(WarriorEquipmentDeleteInputSchema)
	.handler(({ data }) => operations.deleteWarriorEquipment(getDb(), data));
