import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import * as operations from "@/db/operations/equipment.server";
import {
	EquipmentDeleteInputSchema,
	EquipmentSchema,
	EquipmentUpdateInputSchema,
} from "@/db/validation/equipment";

export const listEquipment = createServerFn({ method: "GET" }).handler(() =>
	operations.listEquipment(getDb()),
);

export const createEquipment = createServerFn({ method: "POST" })
	.validator(EquipmentSchema)
	.handler(({ data }) => operations.createEquipment(getDb(), data));

export const updateEquipment = createServerFn({ method: "POST" })
	.validator(EquipmentUpdateInputSchema)
	.handler(({ data }) => operations.updateEquipment(getDb(), data));

export const deleteEquipment = createServerFn({ method: "POST" })
	.validator(EquipmentDeleteInputSchema)
	.handler(({ data }) => operations.deleteEquipment(getDb(), data));
