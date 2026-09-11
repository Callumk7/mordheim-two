import type { Event } from "@/db/validation/event";
import { isEffectiveEvent } from "@/db/validation/event";
import type { Warrior } from "@/db/validation/warrior";

export type CombatStatKey =
	| "knockdownsGiven"
	| "knockdownsTaken"
	| "injuriesGiven"
	| "injuriesTaken"
	| "deathsGiven";

export type CombatStatAdjustments = Record<CombatStatKey, number>;

export interface CombatStats {
	knockdownsGiven: number;
	knockdownsTaken: number;
	injuriesGiven: number;
	injuriesTaken: number;
	deathsGiven: number;
	/** Net manual correction applied to each displayed total. */
	adjustments?: CombatStatAdjustments;
}

export interface WarriorCombatStats extends CombatStats {
	isDead: boolean;
}

export interface CombatStatsProjection {
	warbands: ReadonlyMap<string, CombatStats>;
	warriors: ReadonlyMap<string, WarriorCombatStats>;
}

export const emptyCombatStatAdjustments = (): CombatStatAdjustments => ({
	knockdownsGiven: 0,
	knockdownsTaken: 0,
	injuriesGiven: 0,
	injuriesTaken: 0,
	deathsGiven: 0,
});

const emptyStats = (): CombatStats => ({
	knockdownsGiven: 0,
	knockdownsTaken: 0,
	injuriesGiven: 0,
	injuriesTaken: 0,
	deathsGiven: 0,
	adjustments: emptyCombatStatAdjustments(),
});

const emptyWarriorStats = (): WarriorCombatStats => ({
	...emptyStats(),
	isDead: false,
});

/**
 * Projects event facts, then applies the signed corrections stored on warriors.
 * The legacy field semantics are preserved as offensive achievements:
 * `knocked` (opponents knocked out) corrects deaths given, `injuries` corrects
 * injuries given, and `knockedDowns` corrects knockdowns given. Event
 * attribution remains historical; corrections belong to a warrior's current
 * warband. Corrections never affect `isDead`.
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
	warriors: readonly Pick<
		Warrior,
		"id" | "warbandId" | "knocked" | "injuries" | "knockedDowns"
	>[] = [],
): CombatStatsProjection {
	const warbands = new Map<string, CombatStats>();
	const warriorStatsById = new Map<string, WarriorCombatStats>();

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
			warriorStatsById,
			event.attackerWarriorId,
			emptyWarriorStats,
		);
		const defender = getOrCreate(
			warriorStatsById,
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

	for (const warrior of warriors) {
		const warriorStats = getOrCreate(
			warriorStatsById,
			warrior.id,
			emptyWarriorStats,
		);
		const warbandStats = getOrCreate(warbands, warrior.warbandId, emptyStats);
		applyCorrection(warriorStats, "deathsGiven", warrior.knocked);
		applyCorrection(warbandStats, "deathsGiven", warrior.knocked);
		applyCorrection(warriorStats, "injuriesGiven", warrior.injuries);
		applyCorrection(warbandStats, "injuriesGiven", warrior.injuries);
		applyCorrection(warriorStats, "knockdownsGiven", warrior.knockedDowns);
		applyCorrection(warbandStats, "knockdownsGiven", warrior.knockedDowns);
	}

	return { warbands, warriors: warriorStatsById };
}

function applyCorrection(
	stats: CombatStats,
	key: CombatStatKey,
	correction: number,
) {
	stats[key] += correction;
	if (stats.adjustments) stats.adjustments[key] += correction;
}

export function getCombatStatAdjustment(
	stats: CombatStats,
	key: CombatStatKey,
): number {
	return stats.adjustments?.[key] ?? 0;
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
