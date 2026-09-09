import type { Event } from "@/db/validation/event";
import { isEffectiveEvent } from "@/db/validation/event";

export interface CombatStats {
	knockdownsGiven: number;
	knockdownsTaken: number;
	injuriesGiven: number;
	injuriesTaken: number;
	deathsGiven: number;
}

export interface WarriorCombatStats extends CombatStats {
	isDead: boolean;
}

export interface CombatStatsProjection {
	warbands: ReadonlyMap<string, CombatStats>;
	warriors: ReadonlyMap<string, WarriorCombatStats>;
}

const emptyStats = (): CombatStats => ({
	knockdownsGiven: 0,
	knockdownsTaken: 0,
	injuriesGiven: 0,
	injuriesTaken: 0,
	deathsGiven: 0,
});

const emptyWarriorStats = (): WarriorCombatStats => ({
	...emptyStats(),
	isDead: false,
});

/**
 * Projects combat totals exclusively from event facts. Warband attribution is
 * deliberately taken from each event so later roster transfers do not rewrite
 * history. Unresolved events are still knockdowns; outcomes only affect injury
 * and death totals. Voided events have no effect.
 */
export function projectCombatStats(
	events: readonly Pick<
		Event,
		| "attackerWarbandId"
		| "attackerWarriorId"
		| "defenderWarbandId"
		| "defenderWarriorId"
		| "outcome"
		| "resolvedAt"
		| "voidedAt"
	>[],
): CombatStatsProjection {
	const warbands = new Map<string, CombatStats>();
	const warriors = new Map<string, WarriorCombatStats>();

	for (const event of events) {
		if (event.voidedAt !== null) continue;

		const attackerWarband = getOrCreate(
			warbands,
			event.attackerWarbandId,
			emptyStats,
		);
		const defenderWarband = getOrCreate(
			warbands,
			event.defenderWarbandId,
			emptyStats,
		);
		const attacker = getOrCreate(
			warriors,
			event.attackerWarriorId,
			emptyWarriorStats,
		);
		const defender = getOrCreate(
			warriors,
			event.defenderWarriorId,
			emptyWarriorStats,
		);

		attackerWarband.knockdownsGiven++;
		defenderWarband.knockdownsTaken++;
		attacker.knockdownsGiven++;
		defender.knockdownsTaken++;

		if (!isEffectiveEvent(event)) continue;
		if (event.outcome === "Injury" || event.outcome === "Death") {
			attackerWarband.injuriesGiven++;
			defenderWarband.injuriesTaken++;
			attacker.injuriesGiven++;
			defender.injuriesTaken++;
		}
		if (event.outcome === "Death") {
			attackerWarband.deathsGiven++;
			attacker.deathsGiven++;
			defender.isDead = true;
		}
	}

	return { warbands, warriors };
}

function getOrCreate<K, V>(map: Map<K, V>, key: K, create: () => V): V {
	const existing = map.get(key);
	if (existing) return existing;
	const value = create();
	map.set(key, value);
	return value;
}

export function getWarriorCombatStats(
	projection: CombatStatsProjection,
	warriorId: string,
): WarriorCombatStats {
	return projection.warriors.get(warriorId) ?? emptyWarriorStats();
}

export function getWarbandCombatStats(
	projection: CombatStatsProjection,
	warbandId: string,
): CombatStats {
	return projection.warbands.get(warbandId) ?? emptyStats();
}
