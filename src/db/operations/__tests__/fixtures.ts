import type { Database } from "@/db/index.server";
import { createMatchWithParticipants } from "@/db/operations/matches.server";
import { createWarband } from "@/db/operations/warbands.server";
import { createWarrior } from "@/db/operations/warriors.server";
import { EquipmentSchema } from "@/db/validation/equipment";
import { EventCreateSchema } from "@/db/validation/event";
import { MatchSchema } from "@/db/validation/match";
import { WarbandSchema } from "@/db/validation/warband";
import { WarbandMatchSchema } from "@/db/validation/warband-match";
import { WarriorSchema } from "@/db/validation/warrior";
import { WarriorEquipmentSchema } from "@/db/validation/warrior-equipment";

export const createdAt = "2026-09-01T00:00:00.000Z";
export const updatedAt = "2026-09-10T12:00:00.000Z";
export const clock = () => updatedAt;
const timestamps = { createdAt, updatedAt: createdAt };

export const warband = (id = "a") =>
	WarbandSchema.parse({
		id,
		name: id,
		faction: "Reikland",
		bio: "Veteran mercenaries",
		gold: 0,
		rating: 0,
		wins: 0,
		...timestamps,
	});
export const warrior = (id = "wa", warbandId = "a") =>
	WarriorSchema.parse({
		id,
		warbandId,
		name: id,
		class: "Marksman",
		description: null,
		status: "Alive",
		knocked: 0,
		injuries: 0,
		knockedDowns: 0,
		...timestamps,
	});
export const equipment = (id = "sword") =>
	EquipmentSchema.parse({
		id,
		name: id,
		cost: "10 gc",
		availability: null,
		range: null,
		strength: "As user",
		specialRules: ["Parry"],
		type: "weapon",
		save: null,
		sourceUrl: null,
		sourceText: null,
		notes: null,
		...timestamps,
	});
export const assignment = (
	id = "assignment",
	warriorId = "wa",
	equipmentId = "sword",
) =>
	WarriorEquipmentSchema.parse({ id, warriorId, equipmentId, ...timestamps });
export const match = (id = "match") =>
	MatchSchema.parse({
		id,
		name: id,
		scenario: "Skirmish",
		status: "Scheduled",
		result: "Pending",
		winnerWarbandId: null,
		...timestamps,
	});
export const participant = (warbandId = "a", matchId = "match") =>
	WarbandMatchSchema.parse({
		id: `${matchId}-${warbandId}`,
		warbandId,
		matchId,
		...timestamps,
	});
export const event = (id = "event") =>
	EventCreateSchema.parse({
		id,
		matchId: "match",
		attackerWarbandId: "a",
		attackerWarriorId: "wa",
		defenderWarbandId: "b",
		defenderWarriorId: "wb",
		...timestamps,
	});

export async function seedMatch(db: Database) {
	for (const id of ["a", "b", "c"]) {
		await createWarband(db, warband(id));
		await createWarrior(db, warrior(`w${id}`, id));
	}
	await createMatchWithParticipants(db, {
		match: match(),
		participants: [participant("a"), participant("b")],
	});
}
