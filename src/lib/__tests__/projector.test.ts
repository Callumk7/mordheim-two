import { describe, expect, it } from "vitest";
import type { Event } from "@/db/validation/event";
import type { Match } from "@/db/validation/match";
import type { Warband } from "@/db/validation/warband";
import type { Warrior } from "@/db/validation/warrior";
import {
	DEFAULT_ROTATION_SECONDS,
	findBreakingAlerts,
	getCurrentAlertKeys,
	type ProjectorInput,
	parseRotationSeconds,
	projectProjectorData,
} from "@/lib/projector";

const timestamp = "2026-09-10T12:00:00.000Z";

function warband(
	id: string,
	name: string,
	rating: number,
	wins: number,
): Warband {
	return {
		id,
		name,
		faction: `${name} faction`,
		bio: null,
		gold: 0,
		rating,
		wins,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

function warrior(id: string, name: string, warbandId: string): Warrior {
	return {
		id,
		name,
		class: "Champion",
		description: null,
		status: "Alive",
		warbandId,
		knocked: 0,
		injuries: 0,
		knockedDowns: 0,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

function match(status: Match["status"] = "InProgress"): Match {
	return {
		id: "match",
		name: "The Crossing",
		scenario: "Street Fight",
		status,
		result: status === "Completed" ? "Draw" : "Pending",
		winnerWarbandId: null,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

function event(outcome: Event["outcome"] = null): Event {
	return {
		id: "event",
		matchId: "match",
		attackerWarbandId: "red",
		attackerWarriorId: "attacker",
		defenderWarbandId: "blue",
		defenderWarriorId: "defender",
		notes: null,
		isProcessed: outcome !== null,
		outcome,
		resolvedAt: outcome === null ? null : timestamp,
		voidedAt: null,
		voidReason: null,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

function input(events: Event[] = [event()]): ProjectorInput {
	return {
		events,
		matches: [match()],
		participants: [
			{
				id: "p1",
				matchId: "match",
				warbandId: "red",
				createdAt: timestamp,
				updatedAt: timestamp,
			},
			{
				id: "p2",
				matchId: "match",
				warbandId: "blue",
				createdAt: timestamp,
				updatedAt: timestamp,
			},
		],
		warbands: [warband("blue", "Blue", 120, 1), warband("red", "Red", 120, 3)],
		warriors: [
			warrior("attacker", "Aldred", "red"),
			warrior("defender", "Berta", "blue"),
		],
	};
}

describe("projector rotation", () => {
	it("validates and clamps the rotation query value", () => {
		expect(parseRotationSeconds(undefined)).toBe(DEFAULT_ROTATION_SECONDS);
		expect(parseRotationSeconds("not-a-number")).toBe(DEFAULT_ROTATION_SECONDS);
		expect(parseRotationSeconds("4")).toBe(5);
		expect(parseRotationSeconds("10")).toBe(10);
		expect(parseRotationSeconds("99")).toBe(60);
		expect(parseRotationSeconds("10.5")).toBe(DEFAULT_ROTATION_SECONDS);
	});

	it("accepts numbers from Router's JSON search parser", () => {
		expect(parseRotationSeconds(5)).toBe(5);
		expect(parseRotationSeconds(10)).toBe(10);
		expect(parseRotationSeconds(0)).toBe(5);
		expect(parseRotationSeconds(99)).toBe(60);
		for (const value of [10.5, -1, NaN, Infinity, true, null, {}, []]) {
			expect(parseRotationSeconds(value)).toBe(DEFAULT_ROTATION_SECONDS);
		}
	});
});

describe("projector data", () => {
	it("builds factual standings, match groups, highlights, and event-derived combat stats", () => {
		const data = projectProjectorData(input([event("Death")]));

		expect(data.standings.map((row) => row.name)).toEqual(["Red", "Blue"]);
		expect(data.matches.live[0]).toMatchObject({
			participantNames: ["Blue", "Red"],
			scenario: "Street Fight",
		});
		expect(data.highlights[0]).toMatchObject({
			phase: "Death",
			attackerName: "Aldred",
			defenderName: "Berta",
		});
		expect(
			data.warriors.find((row) => row.id === "attacker")?.combat,
		).toMatchObject({
			knockdownsGiven: 1,
			injuriesGiven: 1,
			deathsGiven: 1,
		});
		expect(
			data.warriors.find((row) => row.id === "defender")?.effectiveStatus,
		).toBe("Dead");
		expect(data.ticker.join(" ")).toContain("rating 120, 3 wins");
	});

	it("includes manual corrections in spotlight stats", () => {
		const corrected = input([event("Injury")]);
		corrected.warriors = corrected.warriors.map((row) =>
			row.id === "attacker" ? { ...row, knockedDowns: -2 } : row,
		);
		const attacker = projectProjectorData(corrected).warriors.find(
			(row) => row.id === "attacker",
		);

		expect(attacker?.combat).toMatchObject({
			knockdownsGiven: -1,
			isDead: false,
			adjustments: { knockdownsGiven: -2 },
		});
	});

	it("excludes voided events and handles an empty campaign", () => {
		const voided = {
			...event("Injury"),
			voidedAt: timestamp,
			voidReason: "Duplicate",
		};
		expect(projectProjectorData(input([voided])).highlights).toEqual([]);
		expect(
			projectProjectorData({
				events: [],
				matches: [],
				participants: [],
				warbands: [],
				warriors: [],
			}),
		).toMatchObject({
			standings: [],
			warriors: [],
			highlights: [],
			ticker: ["No campaign reports are available."],
		});
	});
});

describe("breaking projector alerts", () => {
	it("baselines initial data and deduplicates each event phase", () => {
		const initial = input();
		const baseline = getCurrentAlertKeys(initial);
		expect(findBreakingAlerts(initial, baseline).alerts).toEqual([]);

		const resolved = input([event("Injury")]);
		const firstResolution = findBreakingAlerts(resolved, baseline);
		expect(firstResolution.alerts).toHaveLength(1);
		expect(firstResolution.alerts[0].phase).toBe("Injury");
		expect(findBreakingAlerts(resolved, firstResolution.seen).alerts).toEqual(
			[],
		);
	});

	it("only alerts for active supported phases in InProgress matches", () => {
		const recovery = event("Recovery");
		const voidedDeath = {
			...event("Death"),
			id: "voided",
			voidedAt: timestamp,
			voidReason: "Correction",
		};
		const completed = {
			...input([{ ...event(), id: "late" }]),
			matches: [match("Completed")],
		};
		expect(
			findBreakingAlerts(input([recovery, voidedDeath]), new Set()).alerts,
		).toEqual([]);
		expect(findBreakingAlerts(completed, new Set()).alerts).toEqual([]);
	});

	it("emits every new live event even when the highlights segment is capped", () => {
		const events = Array.from({ length: 7 }, (_, index) => ({
			...event(index % 2 === 0 ? "Injury" : "Death"),
			id: `event-${index}`,
			createdAt: `2026-09-10T12:00:0${index}.000Z`,
		}));
		const result = findBreakingAlerts(input(events), new Set());
		expect(projectProjectorData(input(events)).highlights).toHaveLength(6);
		expect(result.alerts).toHaveLength(7);
		expect(findBreakingAlerts(input(events), result.seen).alerts).toEqual([]);
	});
});
