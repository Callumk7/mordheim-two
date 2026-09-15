import type { Event } from "@/db/validation/event";
import type { Warband } from "@/db/validation/warband";
import type { WarbandMatch } from "@/db/validation/warband-match";
import type { Warrior } from "@/db/validation/warrior";
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
			!warband.isArchived &&
			participantWarbandIds.includes(warband.id) &&
			getWarriorsForWarband(warband.id, warriors).length > 0,
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
		(warbandId) => getWarriorsForWarband(warbandId, warriors).length > 0,
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
		getWarriorsForWarband(values.attackerWarbandId, warriors).some(
			(warrior) => warrior.id === values.attackerWarriorId,
		) &&
		getWarriorsForWarband(values.defenderWarbandId, warriors).some(
			(warrior) => warrior.id === values.defenderWarriorId,
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
