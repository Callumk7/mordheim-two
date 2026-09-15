// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratedImageJob } from "@/components/shared/generated-image-status";
import type { MatchEventRow } from "@/db-collections/projections";
import { MatchEventsTable } from "../match-events-table";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const testState = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock("@tanstack/react-router", async (importOriginal) => {
	const original =
		await importOriginal<typeof import("@tanstack/react-router")>();
	return { ...original, useNavigate: () => testState.navigate };
});

const event: MatchEventRow = {
	id: "event-1",
	campaignId: "campaign-1",
	matchId: "match-1",
	attackerWarbandId: "warband-1",
	attackerWarriorId: "warrior-1",
	attackerName: "Reikland Reavers",
	attackerWarriorName: "Rolf",
	defenderWarbandId: "warband-2",
	defenderWarriorId: "warrior-2",
	defenderName: "Sisters of Sigmar",
	defenderWarriorName: "Marta",
	notes: null,
	outcome: null,
	resolvedAt: null,
	voidedAt: null,
	voidReason: null,
	isProcessed: false,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

const resolved: MatchEventRow = {
	...event,
	outcome: "Injury",
	resolvedAt: "2026-01-01T00:01:00.000Z",
	isProcessed: true,
};

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
	container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
	testState.navigate.mockReset();
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
});

function renderTable(
	events: MatchEventRow[],
	imageJobs?: Record<string, GeneratedImageJob>,
) {
	return act(async () => {
		root.render(
			<MatchEventsTable
				campaignId="campaign-1"
				events={events}
				imageJobs={imageJobs}
				onSetOutcome={vi.fn(async () => undefined)}
			/>,
		);
	});
}

function voidButton() {
	return container.querySelector<HTMLButtonElement>(
		'button[aria-label="Void event for Rolf against Marta"]',
	);
}

describe("MatchEventsTable actions", () => {
	it("opens an event from its row", async () => {
		await renderTable([event]);

		const row = container.querySelectorAll("[role='row']")[1] as HTMLElement;
		await act(async () => row.click());

		expect(testState.navigate).toHaveBeenCalledWith({
			to: "/campaigns/$campaignId/events/$eventId",
			params: { campaignId: "campaign-1", eventId: "event-1" },
		});
	});

	it("names both warriors in the void control and opens the void confirmation", async () => {
		await renderTable([event]);

		const button = voidButton();
		expect(button).not.toBeNull();
		// The icon is decorative; the accessible name carries the meaning.
		expect(button?.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
			"true",
		);

		await act(async () => button?.click());
		expect(testState.navigate).toHaveBeenLastCalledWith({
			to: "/campaigns/$campaignId/events/$eventId/delete",
			params: { campaignId: "campaign-1", eventId: "event-1" },
		});
	});

	it("does not offer to void an already voided event", async () => {
		await renderTable([
			{ ...event, voidedAt: "2026-01-02T00:00:00.000Z", voidReason: "Repeat" },
		]);

		expect(voidButton()).toBeNull();
	});
});

describe("MatchEventsTable illustration status", () => {
	it.each([
		["pending", "Waiting to generate", "status"],
		["queued", "Queued", "status"],
		["processing", "Generating", "status"],
		["failed", "Generation failed", "alert"],
		["enqueue_failed", "Could not queue", "alert"],
		["consumed", "Image unavailable", "alert"],
	])("announces %s as an accessible %s", async (status, label, role) => {
		await renderTable([resolved], {
			[resolved.id]: {
				jobId: "image-1",
				status: status as GeneratedImageJob["status"],
				error: null,
			},
		});

		const indicator = container.querySelector(`[role="${role}"]`);
		expect(indicator?.textContent).toContain(label);
	});

	it("does not claim an illustration for an event that never gets one", async () => {
		await renderTable([{ ...resolved, outcome: "Recovery" }]);

		expect(container.querySelector('[role="status"]')).toBeNull();
		expect(container.querySelector('[role="alert"]')).toBeNull();
	});
});
