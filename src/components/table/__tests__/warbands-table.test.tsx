// @vitest-environment happy-dom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TableCellNumberField } from "@/components/ui/table-cell-field";
import type { Warband } from "@/db/validation/warband";
import { WarbandsTable } from "../warbands-table";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const testState = vi.hoisted(() => ({
	dataTableProps: undefined as Record<string, unknown> | undefined,
	numberFieldProps: undefined as Record<string, unknown> | undefined,
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
	const original =
		await importOriginal<typeof import("@tanstack/react-router")>();
	return {
		...original,
		useNavigate: () => vi.fn(),
	};
});

vi.mock("@/components/ui/number-field", () => ({
	NumberField: (props: Record<string, unknown>) => {
		testState.numberFieldProps = props;
		return (
			<button
				aria-label={props["aria-label"] as string}
				disabled={props.isDisabled as boolean}
				onClick={() =>
					void (props.onChange as (value: number) => Promise<void>)(300)
				}
				type="button"
			/>
		);
	},
}));

vi.mock("../data-table", async (importOriginal) => {
	const original = await importOriginal<typeof import("../data-table")>();
	return {
		...original,
		DataTable: (props: Record<string, unknown>) => {
			testState.dataTableProps = props;
			return null;
		},
	};
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
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		warriors: [],
	},
];

describe("WarbandsTable gold editing", () => {
	beforeEach(() => {
		testState.dataTableProps = undefined;
		testState.numberFieldProps = undefined;
	});

	it("commits changed gold on blur for only the edited warband and ignores an unchanged value", async () => {
		const onUpdateGold = vi.fn(async () => undefined);

		renderToStaticMarkup(
			<WarbandsTable
				combatStats={{} as never}
				onAddWarrior={vi.fn()}
				onUpdateGold={onUpdateGold}
				onUpdateRating={vi.fn()}
				warbands={warbands}
			/>,
		);

		const columns = testState.dataTableProps?.columns as Array<{
			accessorKey?: string;
			id?: string;
			cell?: (context: {
				row: { original: (typeof warbands)[number] };
			}) => ReactElement;
		}>;
		const goldColumn = columns.find(
			(column) => column.id === "gold" || column.accessorKey === "gold",
		);
		const goldField = goldColumn?.cell?.({ row: { original: warbands[1] } });

		expect(goldField?.type).toBe(TableCellNumberField);
		expect(goldField?.props).toMatchObject({
			"aria-label": "Gold for Sisters of Sigmar",
			minValue: 0,
			step: 1,
			value: 275,
		});

		renderToStaticMarkup(goldField as ReactElement);
		expect(testState.numberFieldProps?.commitBehavior).toBe("validate");
		expect(testState.numberFieldProps?.isDisabled).toBe(false);

		const commitOnBlur = testState.numberFieldProps?.onChange as (
			value: number,
		) => Promise<void>;
		await commitOnBlur(275);
		expect(onUpdateGold).not.toHaveBeenCalled();

		await commitOnBlur(300);
		expect(onUpdateGold).toHaveBeenCalledOnce();
		expect(onUpdateGold).toHaveBeenCalledWith("warband-2", 300);
	});

	it("blocks another gold update while the first update is pending", async () => {
		let resolveUpdate: (() => void) | undefined;
		const update = new Promise<void>((resolve) => {
			resolveUpdate = resolve;
		});
		const onUpdateGold = vi.fn(() => update);

		renderToStaticMarkup(
			<WarbandsTable
				combatStats={{} as never}
				onAddWarrior={vi.fn()}
				onUpdateGold={onUpdateGold}
				onUpdateRating={vi.fn()}
				warbands={warbands}
			/>,
		);

		const columns = testState.dataTableProps?.columns as Array<{
			accessorKey?: string;
			id?: string;
			cell?: (context: {
				row: { original: (typeof warbands)[number] };
			}) => ReactElement;
		}>;
		const goldColumn = columns.find(
			(column) => column.id === "gold" || column.accessorKey === "gold",
		);
		const goldField = goldColumn?.cell?.({ row: { original: warbands[1] } });
		const container = document.createElement("div");
		const root = createRoot(container);

		await act(async () => {
			root.render(goldField);
		});
		const field = container.querySelector("button");
		expect(field?.disabled).toBe(false);

		await act(async () => {
			field?.click();
		});
		expect(onUpdateGold).toHaveBeenCalledOnce();
		expect(field?.disabled).toBe(true);

		await act(async () => {
			field?.click();
		});
		expect(onUpdateGold).toHaveBeenCalledOnce();

		await act(async () => {
			resolveUpdate?.();
		});
		expect(field?.disabled).toBe(false);

		await act(async () => {
			field?.click();
		});
		expect(onUpdateGold).toHaveBeenCalledTimes(2);

		await act(async () => {
			root.unmount();
		});
	});
});

describe("WarbandsTable rating editing", () => {
	beforeEach(() => {
		testState.dataTableProps = undefined;
		testState.numberFieldProps = undefined;
	});

	it("commits changed rating on blur for only the edited warband and ignores an unchanged value", async () => {
		const onUpdateRating = vi.fn(async () => undefined);

		renderToStaticMarkup(
			<WarbandsTable
				combatStats={{} as never}
				onAddWarrior={vi.fn()}
				onUpdateGold={vi.fn()}
				onUpdateRating={onUpdateRating}
				warbands={warbands}
			/>,
		);

		const columns = testState.dataTableProps?.columns as Array<{
			accessorKey?: string;
			id?: string;
			cell?: (context: {
				row: { original: (typeof warbands)[number] };
			}) => ReactElement;
		}>;
		const ratingColumn = columns.find(
			(column) => column.id === "rating" || column.accessorKey === "rating",
		);
		const ratingField = ratingColumn?.cell?.({
			row: { original: warbands[1] },
		});

		expect(ratingField?.type).toBe(TableCellNumberField);
		expect(ratingField?.props).toMatchObject({
			"aria-label": "Rating for Sisters of Sigmar",
			minValue: 0,
			step: 1,
			value: 120,
		});

		renderToStaticMarkup(ratingField as ReactElement);
		expect(testState.numberFieldProps?.commitBehavior).toBe("validate");
		expect(testState.numberFieldProps?.isDisabled).toBe(false);

		const commitOnBlur = testState.numberFieldProps?.onChange as (
			value: number,
		) => Promise<void>;
		await commitOnBlur(120);
		expect(onUpdateRating).not.toHaveBeenCalled();

		await commitOnBlur(300);
		expect(onUpdateRating).toHaveBeenCalledOnce();
		expect(onUpdateRating).toHaveBeenCalledWith("warband-2", 300);
	});

	it("blocks another rating update while the first update is pending", async () => {
		let resolveUpdate: (() => void) | undefined;
		const update = new Promise<void>((resolve) => {
			resolveUpdate = resolve;
		});
		const onUpdateRating = vi.fn(() => update);

		renderToStaticMarkup(
			<WarbandsTable
				combatStats={{} as never}
				onAddWarrior={vi.fn()}
				onUpdateGold={vi.fn()}
				onUpdateRating={onUpdateRating}
				warbands={warbands}
			/>,
		);

		const columns = testState.dataTableProps?.columns as Array<{
			accessorKey?: string;
			id?: string;
			cell?: (context: {
				row: { original: (typeof warbands)[number] };
			}) => ReactElement;
		}>;
		const ratingColumn = columns.find(
			(column) => column.id === "rating" || column.accessorKey === "rating",
		);
		const ratingField = ratingColumn?.cell?.({
			row: { original: warbands[1] },
		});
		const container = document.createElement("div");
		const root = createRoot(container);

		await act(async () => {
			root.render(ratingField);
		});
		const field = container.querySelector("button");
		expect(field?.disabled).toBe(false);

		await act(async () => {
			field?.click();
		});
		expect(onUpdateRating).toHaveBeenCalledOnce();
		expect(field?.disabled).toBe(true);

		await act(async () => {
			field?.click();
		});
		expect(onUpdateRating).toHaveBeenCalledOnce();

		await act(async () => {
			resolveUpdate?.();
		});
		expect(field?.disabled).toBe(false);

		await act(async () => {
			field?.click();
		});
		expect(onUpdateRating).toHaveBeenCalledTimes(2);

		await act(async () => {
			root.unmount();
		});
	});
});
