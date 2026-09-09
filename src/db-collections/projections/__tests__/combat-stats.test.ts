import { describe, expect, it } from "vitest";
import type { Event, EventOutcome } from "@/db/validation/event";
import {
	getWarbandCombatStats,
	getWarriorCombatStats,
	projectCombatStats,
} from "../combat-stats";

function event(
	id: string,
	outcome: EventOutcome | null = null,
	overrides: Partial<Event> = {},
): Event {
	return {
		id,
		matchId: "match-1",
		attackerWarbandId: "old-attackers",
		attackerWarriorId: "attacker",
		defenderWarbandId: "old-defenders",
		defenderWarriorId: "defender",
		notes: null,
		outcome,
		resolvedAt: outcome ? "2026-01-02T00:00:00.000Z" : null,
		voidedAt: null,
		voidReason: null,
		isProcessed: outcome !== null,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		...overrides,
	};
}

describe("projectCombatStats", () => {
	it("counts every active event as a knockdown, including recovery and unresolved", () => {
		const projection = projectCombatStats([
			event("unresolved"),
			event("recovery", "Recovery"),
		]);
		expect(getWarriorCombatStats(projection, "attacker")).toMatchObject({
			knockdownsGiven: 2,
			injuriesGiven: 0,
		});
		expect(getWarriorCombatStats(projection, "defender")).toMatchObject({
			knockdownsTaken: 2,
			injuriesTaken: 0,
			isDead: false,
		});
	});

	it("counts multiple injuries and counts death as both injury and death", () => {
		const projection = projectCombatStats([
			event("injury-1", "Injury"),
			event("injury-2", "Injury"),
			event("death", "Death"),
		]);
		expect(getWarriorCombatStats(projection, "attacker")).toMatchObject({
			injuriesGiven: 3,
			deathsGiven: 1,
		});
		expect(getWarriorCombatStats(projection, "defender")).toMatchObject({
			injuriesTaken: 3,
			isDead: true,
		});
	});

	it("deduplicates dead status even if legacy input contains multiple deaths", () => {
		const projection = projectCombatStats([
			event("death-1", "Death"),
			event("death-2", "Death"),
		]);
		expect(getWarriorCombatStats(projection, "defender").isDead).toBe(true);
	});

	it("removes voided effects and restores alive, then counts a replacement", () => {
		const voidedDeath = event("bad-death", "Death", {
			voidedAt: "2026-01-03T00:00:00.000Z",
			voidReason: "Wrong outcome",
		});
		let projection = projectCombatStats([voidedDeath]);
		expect(getWarriorCombatStats(projection, "defender").isDead).toBe(false);
		expect(getWarriorCombatStats(projection, "attacker").knockdownsGiven).toBe(
			0,
		);

		projection = projectCombatStats([
			voidedDeath,
			event("replacement", "Injury"),
		]);
		expect(getWarriorCombatStats(projection, "defender")).toMatchObject({
			isDead: false,
			injuriesTaken: 1,
			knockdownsTaken: 1,
		});
	});

	it("attributes warband history from event IDs rather than current membership", () => {
		const projection = projectCombatStats([event("injury", "Injury")]);
		expect(getWarbandCombatStats(projection, "old-attackers")).toMatchObject({
			knockdownsGiven: 1,
			injuriesGiven: 1,
		});
		expect(getWarbandCombatStats(projection, "new-warband")).toEqual({
			knockdownsGiven: 0,
			knockdownsTaken: 0,
			injuriesGiven: 0,
			injuriesTaken: 0,
			deathsGiven: 0,
		});
	});
});
