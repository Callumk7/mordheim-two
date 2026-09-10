import { describe, expect, it, vi } from "vitest";
import type { WarbandMatch } from "@/db/validation/warband-match";
import {
	buildCreateMatchCommand,
	buildUpdateMatchCommand,
	diffMatchParticipants,
} from "@/lib/match-commands";
import type { MatchFormValues } from "@/lib/match-form";

const timestamp = "2026-09-10T12:00:00.000Z";
const values: MatchFormValues = {
	name: "Battle at the Gate",
	scenario: "Skirmish",
	status: "Scheduled",
	result: "Pending",
	winnerWarbandId: null,
	participantWarbandIds: ["skaven", "reiklanders"],
};

function sources() {
	let nextId = 0;
	return {
		newId: vi.fn(() => `id-${++nextId}`),
		now: vi.fn(() => timestamp),
	};
}

function participant(warbandId: string): WarbandMatch {
	return {
		id: `participant-${warbandId}`,
		matchId: "match-1",
		warbandId,
		createdAt: "2026-09-01T00:00:00.000Z",
		updatedAt: "2026-09-02T00:00:00.000Z",
	};
}

describe("buildCreateMatchCommand", () => {
	it("builds repeatable records with one shared timestamp and linked IDs", () => {
		const dependencies = sources();
		const command = buildCreateMatchCommand(values, dependencies);
		expect(command).toEqual({
			match: {
				id: "id-1",
				name: values.name,
				scenario: values.scenario,
				status: values.status,
				result: values.result,
				winnerWarbandId: null,
				createdAt: timestamp,
				updatedAt: timestamp,
			},
			participants: ["skaven", "reiklanders"].map((warbandId, index) => ({
				id: `id-${index + 2}`,
				matchId: "id-1",
				warbandId,
				createdAt: timestamp,
				updatedAt: timestamp,
			})),
		});
		expect(dependencies.now).toHaveBeenCalledTimes(1);
		expect(dependencies.newId).toHaveBeenCalledTimes(3);
		expect(buildCreateMatchCommand(values, sources())).toEqual(command);
	});

	it("deduplicates selections in first-occurrence order without mutating input", () => {
		const input = {
			...values,
			participantWarbandIds: ["b", "a", "b", "c", "a"],
		};
		const before = structuredClone(input);
		const dependencies = sources();
		const { participants } = buildCreateMatchCommand(input, dependencies);
		expect(participants.map((row) => row.warbandId)).toEqual(["b", "a", "c"]);
		expect(dependencies.newId).toHaveBeenCalledTimes(4);
		expect(input).toEqual(before);
	});

	it("creates a match without participants", () => {
		const dependencies = sources();
		expect(
			buildCreateMatchCommand(
				{ ...values, participantWarbandIds: [] },
				dependencies,
			).participants,
		).toEqual([]);
		expect(dependencies.newId).toHaveBeenCalledTimes(1);
	});
});

describe("diffMatchParticipants", () => {
	it("orders unique additions by selection and removals by existing row order", () => {
		const existing = [participant("b"), participant("a"), participant("keep")];
		const selected = ["new-z", "keep", "new-a", "new-z", "keep"];
		const before = structuredClone({ existing, selected });
		expect(diffMatchParticipants(existing, selected)).toEqual({
			additionWarbandIds: ["new-z", "new-a"],
			removals: [existing[0], existing[1]],
		});
		expect({ existing, selected }).toEqual(before);
	});

	it("does not replace unchanged participants when selections are reordered or repeated", () => {
		const existing = [participant("a"), participant("b")];
		expect(diffMatchParticipants(existing, ["b", "a", "b"])).toEqual({
			additionWarbandIds: [],
			removals: [],
		});
	});

	it("handles empty selections and empty existing participants", () => {
		const existing = [participant("a")];
		expect(diffMatchParticipants(existing, [])).toEqual({
			additionWarbandIds: [],
			removals: existing,
		});
		expect(diffMatchParticipants([], ["a", "a"])).toEqual({
			additionWarbandIds: ["a"],
			removals: [],
		});
		expect(diffMatchParticipants([], [])).toEqual({
			additionWarbandIds: [],
			removals: [],
		});
	});
});

describe("buildUpdateMatchCommand", () => {
	it("builds changes and new records while retaining original removal records", () => {
		const existing = [participant("old"), participant("keep")];
		const input: MatchFormValues = {
			...values,
			status: "Completed",
			result: "Victory",
			winnerWarbandId: "keep",
			participantWarbandIds: ["new-b", "keep", "new-a", "new-b"],
		};
		const before = structuredClone({ existing, input });
		const dependencies = sources();
		const command = buildUpdateMatchCommand(
			"match-1",
			input,
			existing,
			dependencies,
		);
		expect(command).toEqual({
			id: "match-1",
			changes: {
				name: values.name,
				scenario: values.scenario,
				status: "Completed",
				result: "Victory",
				winnerWarbandId: "keep",
			},
			additions: ["new-b", "new-a"].map((warbandId, index) => ({
				id: `id-${index + 1}`,
				matchId: "match-1",
				warbandId,
				createdAt: timestamp,
				updatedAt: timestamp,
			})),
			removals: [existing[0]],
		});
		expect(dependencies.now).toHaveBeenCalledTimes(1);
		expect(dependencies.newId).toHaveBeenCalledTimes(2);
		expect({ existing, input }).toEqual(before);
		expect(
			buildUpdateMatchCommand("match-1", input, existing, sources()),
		).toEqual(command);
	});

	it.each([
		{ selected: ["b", "a", "b"] },
		{ selected: [] },
	])("does not generate IDs or timestamps without additions ($selected)", ({
		selected,
	}) => {
		const dependencies = sources();
		const existing = [participant("a"), participant("b")];
		const command = buildUpdateMatchCommand(
			"match-1",
			{ ...values, participantWarbandIds: selected },
			existing,
			dependencies,
		);
		expect(command.additions).toEqual([]);
		expect(dependencies.newId).not.toHaveBeenCalled();
		expect(dependencies.now).not.toHaveBeenCalled();
	});
});
