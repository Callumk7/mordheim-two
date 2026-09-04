import { getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import {
	getParticipantWarbandIds,
	getWarriorsForWarband,
} from "../../lib/event-options";
import { EventSchema, validateEventMembership } from "../event";
import { events, warbandMatches, warriors } from "../schema";
import { WarbandMatchSchema } from "../warband-match";

const validEvent = {
	id: "event-1",
	matchId: "match-1",
	attackerWarbandId: "warband-a",
	attackerWarriorId: "warrior-a",
	defenderWarbandId: "warband-b",
	defenderWarriorId: "warrior-b",
	notes: null,
};

describe("event relations", () => {
	it("requires distinct warbands and both warriors", () => {
		expect(EventSchema.safeParse(validEvent).success).toBe(true);
		expect(
			EventSchema.safeParse({
				...validEvent,
				defenderWarbandId: validEvent.attackerWarbandId,
			}).success,
		).toBe(false);
		expect(
			EventSchema.safeParse({ ...validEvent, attackerWarriorId: "" }).success,
		).toBe(false);
	});

	it("rejects non-participants and warriors in the wrong warband", () => {
		const participantIds = new Set(["warband-a", "warband-b"]);
		const warriorWarbands = new Map([
			["warrior-a", "warband-a"],
			["warrior-b", "warband-b"],
		]);

		expect(() =>
			validateEventMembership(validEvent, participantIds, warriorWarbands),
		).not.toThrow();
		expect(() =>
			validateEventMembership(
				validEvent,
				new Set(["warband-a"]),
				warriorWarbands,
			),
		).toThrow(/must participate/);
		expect(() =>
			validateEventMembership(
				validEvent,
				participantIds,
				new Map([
					["warrior-a", "warband-b"],
					["warrior-b", "warband-b"],
				]),
			),
		).toThrow(/attacking warrior/);
	});

	it("enforces unique participation and composite event membership", () => {
		const participantConfig = getTableConfig(warbandMatches);
		const warriorConfig = getTableConfig(warriors);
		const eventConfig = getTableConfig(events);

		expect(
			participantConfig.indexes.some(
				(index) =>
					index.config.name === "warband_matches_match_warband_unique" &&
					index.config.unique,
			),
		).toBe(true);
		expect(
			warriorConfig.indexes.some(
				(index) =>
					index.config.name === "warriors_warband_id_unique" &&
					index.config.unique,
			),
		).toBe(true);
		expect(
			eventConfig.foreignKeys
				.map((key) => key.getName())
				.filter(
					(name) => name.includes("membership") || name.includes("participant"),
				)
				.sort(),
		).toEqual([
			"events_attacker_participant_fk",
			"events_attacker_warrior_membership_fk",
			"events_defender_participant_fk",
			"events_defender_warrior_membership_fk",
		]);
	});

	it("filters event choices through match and warband membership", () => {
		const participants = [
			{
				id: "p1",
				matchId: "match-1",
				warbandId: "warband-a",
				createdAt: "now",
				updatedAt: "now",
			},
			{
				id: "p2",
				matchId: "match-2",
				warbandId: "warband-b",
				createdAt: "now",
				updatedAt: "now",
			},
		];
		const warrior = {
			id: "warrior-a",
			name: "A",
			class: "Hero",
			status: "Alive" as const,
			warbandId: "warband-a",
			knocked: 0,
			injuries: 0,
			knockedDowns: 0,
			createdAt: "now",
			updatedAt: "now",
		};

		expect(getParticipantWarbandIds("match-1", participants)).toEqual([
			"warband-a",
		]);
		expect(getWarriorsForWarband("warband-a", [warrior])).toEqual([warrior]);
		expect(getWarriorsForWarband("warband-b", [warrior])).toEqual([]);
	});

	it("rejects incomplete participation rows", () => {
		expect(
			WarbandMatchSchema.safeParse({
				id: "participant-1",
				matchId: "match-1",
				warbandId: "warband-a",
			}).success,
		).toBe(true);
		expect(
			WarbandMatchSchema.safeParse({ id: "participant-1", matchId: "match-1" })
				.success,
		).toBe(false);
	});
});
