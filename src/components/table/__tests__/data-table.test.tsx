// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDataTableColumnHelper, DataTable } from "../data-table";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type Row = { id: string; name: string; gold: number };

type DataTableProps = Parameters<typeof DataTable<Row>>[0];

const column = createDataTableColumnHelper<Row>();
const columns = column.columns([
	column.accessor("name", {
		header: "Name",
		meta: { isRowHeader: true },
	}),
	column.accessor("gold", { header: "Gold" }),
]);

const rows: Row[] = [
	{ id: "b", name: "Sisters of Sigmar", gold: 275 },
	{ id: "a", name: "Reikland Reavers", gold: 500 },
];

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
	container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
});

function renderTable(props: Partial<DataTableProps> = {}) {
	return act(async () => {
		root.render(
			<DataTable
				ariaLabel="Warbands"
				columns={columns}
				data={rows}
				emptyMessage="No warbands yet."
				itemLabel={{ plural: "warbands", singular: "warband" }}
				searchPlaceholder="Search warbands"
				{...props}
			/>,
		);
	});
}

function rowHeaders() {
	return [...container.querySelectorAll("[role='rowheader']")].map(
		(cell) => cell.textContent,
	);
}

async function search(value: string) {
	const input = container.querySelector("input");
	if (!input) throw new Error("Expected a search field");
	const setter = Object.getOwnPropertyDescriptor(
		HTMLInputElement.prototype,
		"value",
	)?.set;
	await act(async () => {
		setter?.call(input, value);
		input.dispatchEvent(new Event("input", { bubbles: true }));
	});
}

describe("DataTable", () => {
	it("lists every row and reports the visible count", async () => {
		await renderTable();

		expect(rowHeaders()).toEqual(["Sisters of Sigmar", "Reikland Reavers"]);
		expect(
			container.querySelector("output[aria-live='polite']")?.textContent,
		).toBe("2 of 2 warbands");
	});

	it("filters rows by any searchable column and reports the narrowed count", async () => {
		await renderTable();

		await search("sigmar");
		expect(rowHeaders()).toEqual(["Sisters of Sigmar"]);
		expect(
			container.querySelector("output[aria-live='polite']")?.textContent,
		).toBe("1 of 2 warbands");

		await search("500");
		expect(rowHeaders()).toEqual(["Reikland Reavers"]);
	});

	it("shows the empty message when a search matches nothing, and clears back", async () => {
		await renderTable();

		await search("orcs");
		expect(container.textContent).toContain("No warbands yet.");
		expect(container.textContent).not.toContain("Sisters of Sigmar");
		expect(container.textContent).not.toContain("Reikland Reavers");

		const clear = [...container.querySelectorAll("button")].find(
			(button) => button.getAttribute("aria-label") === "Clear search",
		);
		await act(async () => clear?.click());
		expect(rowHeaders()).toHaveLength(2);
	});

	it("shows the empty message for an empty collection", async () => {
		await renderTable({ data: [] });

		expect(container.textContent).toContain("No warbands yet.");
		expect(
			container.querySelector("output[aria-live='polite']")?.textContent,
		).toBe("0 of 0 warbands");
	});

	it("sorts by a column and reverses on a second activation", async () => {
		await renderTable();

		const header = [
			...container.querySelectorAll("[role='columnheader']"),
		].find((cell) => cell.textContent?.includes("Name"));
		const sort = header?.querySelector("button") ?? header;

		await act(async () => (sort as HTMLElement | undefined)?.click());
		expect(rowHeaders()).toEqual(["Reikland Reavers", "Sisters of Sigmar"]);

		await act(async () => (sort as HTMLElement | undefined)?.click());
		expect(rowHeaders()).toEqual(["Sisters of Sigmar", "Reikland Reavers"]);
	});

	it("respects an initial sort order", async () => {
		await renderTable({ initialSorting: [{ id: "gold", desc: false }] });

		expect(rowHeaders()).toEqual(["Sisters of Sigmar", "Reikland Reavers"]);
	});

	it("hands the activated row's own record to onRowAction", async () => {
		const onRowAction = vi.fn();
		await renderTable({ onRowAction });

		const row = container.querySelectorAll("[role='row']")[1] as HTMLElement;
		await act(async () => {
			row.dispatchEvent(
				new MouseEvent("pointerdown", { bubbles: true, detail: 1 }),
			);
			row.dispatchEvent(
				new MouseEvent("pointerup", { bubbles: true, detail: 1 }),
			);
			row.click();
		});

		expect(onRowAction).toHaveBeenCalledWith(rows[0]);
	});
});
