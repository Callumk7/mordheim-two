import type { Event } from "@/db/event";
import type { Warband } from "@/db/warband";
import type { WarbandMatch } from "@/db/warband-match";
import type { Warrior } from "@/db/warrior";
import {
	getParticipantWarbandIds,
	getWarriorsForWarband,
} from "@/lib/event-options";

export type EventFormValues = Pick<
	Event,
	| "matchId"
	| "attackerWarbandId"
	| "attackerWarriorId"
	| "defenderWarbandId"
	| "defenderWarriorId"
	| "notes"
>;

export function deriveEventFormOptions(
	values: EventFormValues,
	participants: readonly WarbandMatch[],
	warbands: readonly Warband[],
	warriors: readonly Warrior[],
) {
	const participantWarbandIds = getParticipantWarbandIds(
		values.matchId,
		participants,
	);
	const participantWarbands = warbands.filter(
		(warband) =>
			participantWarbandIds.includes(warband.id) &&
			warriors.some((warrior) => warrior.warbandId === warband.id),
	);

	return {
		participantWarbandIds,
		participantWarbands,
		attackerWarriors: getWarriorsForWarband(values.attackerWarbandId, warriors),
		defenderWarriors: getWarriorsForWarband(values.defenderWarbandId, warriors),
	};
}

export function changeEventMatch(
	values: EventFormValues,
	matchId: string,
	participants: readonly WarbandMatch[],
	warriors: readonly Warrior[],
): EventFormValues {
	const nextWarbandIds = getParticipantWarbandIds(matchId, participants).filter(
		(warbandId) => warriors.some((warrior) => warrior.warbandId === warbandId),
	);
	const attackerWarbandId = nextWarbandIds[0] ?? "";
	const defenderWarbandId = nextWarbandIds[1] ?? "";

	return {
		...values,
		matchId,
		attackerWarbandId,
		attackerWarriorId:
			getWarriorsForWarband(attackerWarbandId, warriors)[0]?.id ?? "",
		defenderWarbandId,
		defenderWarriorId:
			getWarriorsForWarband(defenderWarbandId, warriors)[0]?.id ?? "",
	};
}

export function changeEventAttackerWarband(
	values: EventFormValues,
	attackerWarbandId: string,
	warriors: readonly Warrior[],
): EventFormValues {
	return {
		...values,
		attackerWarbandId,
		attackerWarriorId:
			getWarriorsForWarband(attackerWarbandId, warriors)[0]?.id ?? "",
	};
}

export function changeEventDefenderWarband(
	values: EventFormValues,
	defenderWarbandId: string,
	warriors: readonly Warrior[],
): EventFormValues {
	return {
		...values,
		defenderWarbandId,
		defenderWarriorId:
			getWarriorsForWarband(defenderWarbandId, warriors)[0]?.id ?? "",
	};
}

export function hasDuplicateEventWarbands(values: EventFormValues) {
	return (
		Boolean(values.attackerWarbandId) &&
		Boolean(values.defenderWarbandId) &&
		values.attackerWarbandId === values.defenderWarbandId
	);
}

export function canSubmitEvent(
	values: EventFormValues,
	participants: readonly WarbandMatch[],
	warriors: readonly Warrior[],
) {
	const participantWarbandIds = getParticipantWarbandIds(
		values.matchId,
		participants,
	);

	return (
		participantWarbandIds.includes(values.attackerWarbandId) &&
		participantWarbandIds.includes(values.defenderWarbandId) &&
		values.attackerWarbandId !== values.defenderWarbandId &&
		warriors.some(
			(warrior) =>
				warrior.id === values.attackerWarriorId &&
				warrior.warbandId === values.attackerWarbandId,
		) &&
		warriors.some(
			(warrior) =>
				warrior.id === values.defenderWarriorId &&
				warrior.warbandId === values.defenderWarbandId,
		)
	);
}

export function normalizeEventFormValues(
	values: EventFormValues,
): EventFormValues {
	return {
		...values,
		notes: values.notes?.trim() || null,
	};
}
