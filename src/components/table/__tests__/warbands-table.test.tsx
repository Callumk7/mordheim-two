// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Warband } from "@/db/validation/warband";
import { projectCombatStats } from "@/db-collections/projections";
import { WarbandsTable } from "../warbands-table";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const testState = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock("@tanstack/react-router", async (importOriginal) => {
	const original =
		await importOriginal<typeof import("@tanstack/react-router")>();
	return { ...original, useNavigate: () => testState.navigate };
});

const warbands: Array<Warband & { warriors: [] }> = [
	{
		id: "warband-1",
		name: "Reikland Reavers",
		faction: "Mercenaries",
		bio: null,
		gold: 500,
		rating: 100,
		wins: 0,
		isArchived: false,
		archivedAt: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		warriors: [],
	},
	{
		id: "warband-2",
		name: "Sisters of Sigmar",
		faction: "Sisters of Sigmar",
		bio: null,
		gold: 275,
		rating: 120,
		wins: 1,
		isArchived: false,
		archivedAt: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		warriors: [],
	},
];

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

async function renderTable(
	handlers: {
		onUpdateGold?: (warbandId: string, gold: number) => Promise<void>;
		onUpdateRating?: (warbandId: string, rating: number) => Promise<void>;
		onAddWarrior?: (warband: Warband) => void;
	} = {},
) {
	await act(async () => {
		root.render(
			<WarbandsTable
				combatStats={projectCombatStats([])}
				onAddWarrior={handlers.onAddWarrior ?? vi.fn()}
				onUpdateGold={handlers.onUpdateGold ?? vi.fn(async () => undefined)}
				onUpdateRating={handlers.onUpdateRating ?? vi.fn(async () => undefined)}
				warbands={warbands}
			/>,
		);
	});
}

/** Each editable cell is named after the warband it belongs to. */
function field(label: string) {
	const input = container.querySelector<HTMLInputElement>(
		`input[aria-label="${label}"]`,
	);
	if (!input) throw new Error(`No field labelled "${label}"`);
	return input;
}

async function edit(label: string, next: string) {
	const input = field(label);
	const setter = Object.getOwnPropertyDescriptor(
		HTMLInputElement.prototype,
		"value",
	)?.set;
	await act(async () => {
		input.focus();
		setter?.call(input, next);
		input.dispatchEvent(new Event("input", { bubbles: true }));
		// Enter, not blur: the table's focus manager returns focus to the row, so
		// a blur inside a cell never reaches the field.
		input.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
		);
		input.dispatchEvent(
			new KeyboardEvent("keyup", { key: "Enter", bubbles: true }),
		);
	});
}

describe("WarbandsTable", () => {
	it("shows each warband's current gold and rating in its own row", async () => {
		await renderTable();

		expect(field("Gold for Sisters of Sigmar").value).toBe("275");
		expect(field("Rating for Sisters of Sigmar").value).toBe("120");
		expect(field("Gold for Reikland Reavers").value).toBe("500");
	});

	it("saves edited gold against the edited warband only", async () => {
		const onUpdateGold = vi.fn(async () => undefined);
		await renderTable({ onUpdateGold });

		await edit("Gold for Sisters of Sigmar", "300");

		expect(onUpdateGold).toHaveBeenCalledExactlyOnceWith("warband-2", 300);
	});

	it("saves edited rating against the edited warband only", async () => {
		const onUpdateRating = vi.fn(async () => undefined);
		await renderTable({ onUpdateRating });

		await edit("Rating for Sisters of Sigmar", "300");

		expect(onUpdateRating).toHaveBeenCalledExactlyOnceWith("warband-2", 300);
	});

	it("does not save a value the warband already holds", async () => {
		const onUpdateGold = vi.fn(async () => undefined);
		const onUpdateRating = vi.fn(async () => undefined);
		await renderTable({ onUpdateGold, onUpdateRating });

		await edit("Gold for Sisters of Sigmar", "275");
		await edit("Rating for Sisters of Sigmar", "120");

		expect(onUpdateGold).not.toHaveBeenCalled();
		expect(onUpdateRating).not.toHaveBeenCalled();
	});

	it("opens a warband from its row", async () => {
		await renderTable();

		const row = container.querySelectorAll("[role='row']")[1] as HTMLElement;
		await act(async () => row.click());

		expect(testState.navigate).toHaveBeenCalledWith({
			to: "/warbands/$warbandId",
			params: { warbandId: expect.any(String) },
		});
	});
});
