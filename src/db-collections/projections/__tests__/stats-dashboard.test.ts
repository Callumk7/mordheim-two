import { describe, expect, it } from "vitest";
import type { Warband } from "@/db/validation/warband";
import type { Warrior } from "@/db/validation/warrior";
import {
	type CombatStats,
	type CombatStatsProjection,
	projectCombatStats,
} from "@/db-collections/projections/combat-stats";
import { projectStatsDashboard } from "@/db-collections/projections/stats-dashboard";

function makeWarband(id: string): Warband {
	return {
		id,
		name: id,
		faction: "Mercenaries",
		bio: null,
		gold: 0,
		rating: 100,
		wins: 0,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	};
}

function makeWarrior(id: string, warbandId: string): Warrior {
	return {
		id,
		name: id,
		class: "Hero",
		status: "Alive",
		warbandId,
		knocked: 0,
		injuries: 0,
		knockedDowns: 0,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	};
}

function stats(knockdownsGiven: number): CombatStats {
	return {
		knockdownsGiven,
		knockdownsTaken: 0,
		injuriesGiven: 0,
		injuriesTaken: 0,
		deathsGiven: 0,
	};
}

const event = {
	attackerWarbandId: "attacker",
	attackerWarriorId: "attacker-warrior",
	defenderWarbandId: "defender",
	defenderWarriorId: "defender-warrior",
	outcome: "Death",
	resolvedAt: "2026-01-01T00:00:00.000Z",
	voidedAt: null,
} as const;

describe("projectStatsDashboard", () => {
	it("returns an empty dashboard for an empty campaign", () => {
		const dashboard = projectStatsDashboard({
			warbands: [],
			warriors: [],
			combatStats: projectCombatStats([]),
		});

		expect(dashboard).toEqual({
			warbandRows: [],
			warriorRows: [],
			warbandById: new Map(),
			warriorById: new Map(),
			totals: { knockdowns: 0, injuries: 0, deaths: 0 },
			totalAdjustments: { knockdowns: 0, injuries: 0, deaths: 0 },
			hasCombat: false,
			leadingWarbands: [],
		});
	});

	it("includes zero-combat entities in standings and lookups, but not chart leaders", () => {
		const warband = makeWarband("warband");
		const warrior = makeWarrior("warrior", warband.id);
		const dashboard = projectStatsDashboard({
			warbands: [warband],
			warriors: [warrior],
			combatStats: projectCombatStats([]),
		});

		expect(dashboard.warbandRows).toEqual([
			expect.objectContaining({ id: warband.id, rank: 1, ...stats(0) }),
		]);
		expect(dashboard.warriorRows).toEqual([
			expect.objectContaining({ id: warrior.id, rank: 1, ...stats(0) }),
		]);
		expect(dashboard.warbandById.get(warband.id)).toBe(warband);
		expect(dashboard.warriorById.get(warrior.id)).toBe(warrior);
		expect(dashboard.leadingWarbands).toEqual([]);
		expect(dashboard.hasCombat).toBe(false);
	});

	it("selects eight combat leaders in leaderboard order without mutating inputs", () => {
		const warbands = Object.freeze([
			makeWarband("idle"),
			...Array.from({ length: 10 }, (_, index) =>
				makeWarband(`warband-${index}`),
			),
		]);
		const combatStats: CombatStatsProjection = {
			warbands: new Map(
				warbands.map((warband, index) => [warband.id, stats(index)]),
			),
			warriors: new Map(),
		};
		const before = structuredClone(combatStats);
		const dashboard = projectStatsDashboard({
			warbands,
			warriors: [],
			combatStats,
		});

		expect(dashboard.leadingWarbands.map((row) => row.id)).toEqual([
			"warband-9",
			"warband-8",
			"warband-7",
			"warband-6",
			"warband-5",
			"warband-4",
			"warband-3",
			"warband-2",
		]);
		expect(dashboard.warbandRows).toHaveLength(11);
		expect(dashboard.totals.knockdowns).toBe(55);
		expect(combatStats).toEqual(before);
	});

	it("keeps campaign totals event-derived when entities are missing from the roster", () => {
		const dashboard = projectStatsDashboard({
			warbands: [makeWarband("defender")],
			warriors: [makeWarrior("defender-warrior", "defender")],
			combatStats: projectCombatStats([event]),
		});

		expect(dashboard.totals).toEqual({ knockdowns: 1, injuries: 1, deaths: 1 });
		expect(dashboard.hasCombat).toBe(true);
		expect(dashboard.leadingWarbands).toEqual([]);
		expect(dashboard.warbandRows.map((row) => row.id)).toEqual(["defender"]);
	});

	it("keeps campaign and warband aggregates consistent with warrior corrections", () => {
		const red = makeWarband("red");
		const plusTwo = {
			...makeWarrior("plus-two", red.id),
			knocked: 2,
			injuries: -2,
			knockedDowns: 2,
		};
		const minusOne = {
			...makeWarrior("minus-one", red.id),
			knocked: -1,
			injuries: 1,
			knockedDowns: -1,
		};
		const combatStats = projectCombatStats([], [plusTwo, minusOne]);
		const dashboard = projectStatsDashboard({
			warbands: [red],
			warriors: [plusTwo, minusOne],
			combatStats,
		});

		expect(
			dashboard.warriorRows.reduce(
				(total, row) => total + row.knockdownsGiven,
				0,
			),
		).toBe(1);
		expect(dashboard.warbandRows[0]).toMatchObject({
			knockdownsGiven: 1,
			injuriesGiven: -1,
			deathsGiven: 1,
			adjustments: {
				knockdownsGiven: 1,
				injuriesGiven: -1,
				deathsGiven: 1,
			},
		});
		expect(dashboard.totals).toEqual({
			knockdowns: 1,
			injuries: -1,
			deaths: 1,
		});
		expect(dashboard.totalAdjustments).toEqual({
			knockdowns: 1,
			injuries: -1,
			deaths: 1,
		});
	});

	it("reflects updated combat projections without retaining previous totals", () => {
		const input = {
			warbands: [makeWarband("attacker")],
			warriors: [makeWarrior("attacker-warrior", "attacker")],
		};
		const active = projectStatsDashboard({
			...input,
			combatStats: projectCombatStats([event]),
		});
		const voided = projectStatsDashboard({
			...input,
			combatStats: projectCombatStats([
				{ ...event, voidedAt: event.resolvedAt },
			]),
		});

		expect(active.warriorRows[0].deathsGiven).toBe(1);
		expect(active.leadingWarbands).toHaveLength(1);
		expect(voided.warriorRows[0].deathsGiven).toBe(0);
		expect(voided.totals).toEqual({ knockdowns: 0, injuries: 0, deaths: 0 });
		expect(voided.hasCombat).toBe(false);
		expect(voided.leadingWarbands).toEqual([]);
	});
});
