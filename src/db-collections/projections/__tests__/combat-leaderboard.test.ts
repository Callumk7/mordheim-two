import { describe, expect, it } from "vitest";
import type { CombatStats } from "@/db-collections/projections/combat-stats";
import { buildCombatLeaderboard } from "../combat-leaderboard";

const stats = (overrides: Partial<CombatStats> = {}): CombatStats => ({
	knockdownsGiven: 0,
	knockdownsTaken: 0,
	injuriesGiven: 0,
	injuriesTaken: 0,
	deathsGiven: 0,
	...overrides,
});

describe("buildCombatLeaderboard", () => {
	it("sorts by deaths, injuries, and knockdowns with deterministic tied ranks", () => {
		const entities = [
			{ id: "z", name: "Zealot" },
			{ id: "b", name: "Bravo" },
			{ id: "a", name: "Alpha" },
			{ id: "c", name: "Champion" },
		];
		const statsById = new Map([
			["z", stats({ deathsGiven: 1 })],
			["b", stats({ injuriesGiven: 2, knockdownsGiven: 4 })],
			["a", stats({ injuriesGiven: 2, knockdownsGiven: 4 })],
			["c", stats({ injuriesGiven: 3, knockdownsGiven: 9 })],
		]);

		const rows = buildCombatLeaderboard(entities, statsById);

		expect(rows.map(({ id, rank }) => ({ id, rank }))).toEqual([
			{ id: "z", rank: 1 },
			{ id: "c", rank: 2 },
			{ id: "a", rank: 3 },
			{ id: "b", rank: 3 },
		]);
	});

	it("includes current entities without projected events as zero-stat rows", () => {
		const rows = buildCombatLeaderboard(
			[
				{ id: "active", name: "Active" },
				{ id: "new", name: "New recruit" },
			],
			new Map([["active", stats({ knockdownsGiven: 1 })]]),
		);

		expect(rows[1]).toEqual({
			id: "new",
			name: "New recruit",
			rank: 2,
			knockdownsGiven: 0,
			knockdownsTaken: 0,
			injuriesGiven: 0,
			injuriesTaken: 0,
			deathsGiven: 0,
		});
	});

	it("returns an empty leaderboard when there are no current entities", () => {
		expect(
			buildCombatLeaderboard(
				[],
				new Map([["historical", stats({ deathsGiven: 4 })]]),
			),
		).toEqual([]);
	});
});
