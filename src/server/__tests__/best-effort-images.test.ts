import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Match completion and event resolution are durable source data. Illustrating
 * them is a best-effort side effect, so an image-generation failure must never
 * surface to the client as a failed mutation — the client would retry a write
 * that already succeeded, and event resolution is not repeatable.
 */
const state = vi.hoisted(() => ({
	db: { marker: "test-db" },
	queue: { send: vi.fn() },
}));

const operations = vi.hoisted(() => ({
	updateMatch: vi.fn(),
	updateMatchWithParticipants: vi.fn(),
	createMatchWithParticipants: vi.fn(),
	listMatches: vi.fn(),
	createMatch: vi.fn(),
	deleteMatch: vi.fn(),
	resolveEvent: vi.fn(),
	listEvents: vi.fn(),
	createEvent: vi.fn(),
	updateEvent: vi.fn(),
	voidEvent: vi.fn(),
	submitCompletedMatchImage: vi.fn(),
	submitEventImage: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({
	env: {
		get IMAGE_GENERATION_QUEUE() {
			return state.queue;
		},
	},
}));
vi.mock("@/db/index.server", () => ({ getDb: () => state.db }));
vi.mock("@/db/operations/matches.server", () => operations);
vi.mock("@/db/operations/events.server", () => operations);
vi.mock("@/db/operations/match-images.server", () => ({
	submitCompletedMatchImage: operations.submitCompletedMatchImage,
}));
vi.mock("@/db/operations/event-images.server", () => ({
	submitEventImage: operations.submitEventImage,
}));

// A real server function needs the Start request runtime. Standing in for the
// builder runs the same validator and the same handler body, which is what these
// tests are about; the framework's transport is not.
vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => {
		let validate: ((data: unknown) => unknown) | undefined;
		const builder = {
			validator(schema: { parse: (data: unknown) => unknown }) {
				validate = (data) => schema.parse(data);
				return builder;
			},
			handler(run: (input: { data: unknown }) => unknown) {
				return async (input: { data: unknown } = { data: undefined }) =>
					run({ data: validate ? validate(input.data) : input.data });
			},
		};
		return builder;
	},
}));

const {
	updateMatch,
	updateMatchWithParticipants,
	createMatchWithParticipants,
} = await import("@/server/matches");
const { resolveEvent } = await import("@/server/events");

function invoke(serverFn: unknown, data: unknown) {
	return (serverFn as (input: { data: unknown }) => Promise<unknown>)({ data });
}

beforeEach(() => {
	for (const fn of Object.values(operations)) {
		fn.mockReset();
		fn.mockResolvedValue(undefined);
	}
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("match completion illustrations", () => {
	it("submits a match image once an outcome-affecting update lands", async () => {
		await invoke(updateMatch, {
			id: "match-1",
			changes: { result: "Victory", winnerWarbandId: "warband-a" },
		});

		expect(operations.updateMatch).toHaveBeenCalledOnce();
		expect(operations.submitCompletedMatchImage).toHaveBeenCalledOnce();
		expect(operations.submitCompletedMatchImage).toHaveBeenCalledWith(
			state.db,
			state.queue,
			"match-1",
		);
	});

	it("does not submit an image for a change that cannot affect the outcome", async () => {
		await invoke(updateMatch, {
			id: "match-1",
			changes: { name: "Renamed", scenario: "Skirmish" },
		});

		expect(operations.updateMatch).toHaveBeenCalledOnce();
		expect(operations.submitCompletedMatchImage).not.toHaveBeenCalled();
	});

	it("succeeds even when the illustration cannot be queued", async () => {
		operations.submitCompletedMatchImage.mockRejectedValue(
			new Error("Queue unavailable"),
		);

		await expect(
			invoke(updateMatch, {
				id: "match-1",
				changes: { status: "Completed" },
			}),
		).resolves.toBeUndefined();

		expect(operations.updateMatch).toHaveBeenCalledOnce();
	});

	it("still reports a genuine failure to save the match", async () => {
		operations.updateMatch.mockRejectedValue(
			new Error("A victory needs a winning warband"),
		);

		await expect(
			invoke(updateMatch, {
				id: "match-1",
				changes: { result: "Victory", winnerWarbandId: "outsider" },
			}),
		).rejects.toThrow("A victory needs a winning warband");

		expect(operations.submitCompletedMatchImage).not.toHaveBeenCalled();
	});

	it("applies the same contract to a participant update", async () => {
		operations.submitCompletedMatchImage.mockRejectedValue(
			new Error("Queue unavailable"),
		);

		await expect(
			invoke(updateMatchWithParticipants, {
				id: "match-1",
				changes: { status: "Completed" },
				additions: [],
				removals: [],
			}),
		).resolves.toBeUndefined();

		expect(operations.updateMatchWithParticipants).toHaveBeenCalledOnce();
	});

	it("illustrates a match created as already completed, and only then", async () => {
		const match = {
			id: "match-1",
			campaignId: "campaign-1",
			name: "The Encounter",
			scenario: "Street Fight",
			result: "Pending" as const,
			winnerWarbandId: null,
		};

		await invoke(createMatchWithParticipants, {
			match: { ...match, status: "Scheduled" },
			participants: [],
		});
		expect(operations.submitCompletedMatchImage).not.toHaveBeenCalled();

		await invoke(createMatchWithParticipants, {
			match: { ...match, id: "match-2", status: "Completed" },
			participants: [],
		});
		expect(operations.submitCompletedMatchImage).toHaveBeenCalledOnce();
	});
});

describe("event resolution illustrations", () => {
	it.each([
		"Injury",
		"Death",
	])("submits an illustration for a resolved %s", async (outcome) => {
		await invoke(resolveEvent, { id: "event-1", outcome });

		expect(operations.resolveEvent).toHaveBeenCalledOnce();
		expect(operations.submitEventImage).toHaveBeenCalledWith(
			state.db,
			state.queue,
			"event-1",
		);
	});

	it("does not illustrate a Recovery", async () => {
		await invoke(resolveEvent, { id: "event-1", outcome: "Recovery" });

		expect(operations.resolveEvent).toHaveBeenCalledOnce();
		expect(operations.submitEventImage).not.toHaveBeenCalled();
	});

	it("rejects an outcome the campaign does not recognise before saving", async () => {
		await expect(
			invoke(resolveEvent, { id: "event-1", outcome: "Knockdown" }),
		).rejects.toThrow();

		expect(operations.resolveEvent).not.toHaveBeenCalled();
	});

	it("does not make the client retry an immutable resolution when queuing fails", async () => {
		operations.submitEventImage.mockRejectedValue(new Error("D1 unavailable"));

		await expect(
			invoke(resolveEvent, { id: "event-1", outcome: "Death" }),
		).resolves.toBeUndefined();

		expect(operations.resolveEvent).toHaveBeenCalledOnce();
	});

	it("still reports a refused resolution", async () => {
		operations.resolveEvent.mockRejectedValue(
			new Error("This warrior is already dead."),
		);

		await expect(
			invoke(resolveEvent, { id: "event-1", outcome: "Death" }),
		).rejects.toThrow("This warrior is already dead.");

		expect(operations.submitEventImage).not.toHaveBeenCalled();
	});
});
