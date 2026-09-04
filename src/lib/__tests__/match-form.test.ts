import { describe, expect, it } from "vitest";
import {
	canSubmitMatch,
	changeMatchParticipantSelection,
	isMatchParticipantLocked,
	type MatchFormValues,
} from "../match-form";

const values: MatchFormValues = {
	name: "The Encounter",
	scenario: "Street Fight",
	status: "Scheduled",
	participantWarbandIds: ["alpha", "beta"],
};

describe("match participant locking", () => {
	it("locks only selected participants that are referenced by an event", () => {
		expect(
			isMatchParticipantLocked("alpha", values.participantWarbandIds, [
				"alpha",
				"gamma",
			]),
		).toBe(true);
		expect(
			isMatchParticipantLocked("beta", values.participantWarbandIds, ["alpha"]),
		).toBe(false);
		expect(
			isMatchParticipantLocked("gamma", values.participantWarbandIds, [
				"gamma",
			]),
		).toBe(false);
	});

	it("does not remove a locked selected participant", () => {
		expect(
			changeMatchParticipantSelection(
				values.participantWarbandIds,
				"alpha",
				false,
				["alpha"],
			),
		).toEqual(["alpha", "beta"]);
	});

	it("adds and removes unlocked participants without creating duplicates", () => {
		expect(
			changeMatchParticipantSelection(
				values.participantWarbandIds,
				"gamma",
				true,
				[],
			),
		).toEqual(["alpha", "beta", "gamma"]);
		expect(
			changeMatchParticipantSelection(
				values.participantWarbandIds,
				"alpha",
				true,
				[],
			),
		).toEqual(["alpha", "beta"]);
		expect(
			changeMatchParticipantSelection(
				values.participantWarbandIds,
				"beta",
				false,
				[],
			),
		).toEqual(["alpha"]);
	});
});

describe("match submit eligibility", () => {
	it("requires non-whitespace name and scenario values", () => {
		expect(canSubmitMatch(values)).toBe(true);
		expect(canSubmitMatch({ ...values, name: " \t " })).toBe(false);
		expect(canSubmitMatch({ ...values, scenario: "\n" })).toBe(false);
	});

	it("does not require participants to save a match", () => {
		expect(canSubmitMatch({ ...values, participantWarbandIds: [] })).toBe(true);
	});
});
