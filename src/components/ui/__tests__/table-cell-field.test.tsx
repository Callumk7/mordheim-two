// @vitest-environment happy-dom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { TableCellNumberField, TableCellSelect } from "../table-cell-field";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const testState = vi.hoisted(() => ({
	selectProps: undefined as Record<string, unknown> | undefined,
}));

vi.mock("../select", () => ({
	Select: (props: Record<string, unknown>) => {
		testState.selectProps = props;
		return <div>{props.children as ReactNode}</div>;
	},
	SelectContent: () => null,
	SelectItem: () => null,
	SelectTrigger: (props: Record<string, unknown>) => (
		<div aria-describedby={props["aria-describedby"] as string} />
	),
	SelectValue: () => null,
}));

describe("TableCellSelect rejection reporting", () => {
	it("shows a rejected commit's reason to sighted users, not only screen readers", async () => {
		const reason = "This warrior is already dead.";
		// Detached on purpose: the Workers global Element.append shadows the DOM one.
		const container = document.createElement("div");
		const root = createRoot(container);

		await act(async () => {
			root.render(
				<TableCellSelect
					aria-label="Outcome"
					onCommit={() => Promise.reject(new Error(reason))}
					options={["Injury", "Death"]}
					value=""
				/>,
			);
		});
		await act(async () => {
			await (testState.selectProps?.onChange as (key: string) => Promise<void>)(
				"Death",
			);
		});

		const alert = container.querySelector('[role="alert"]');
		expect(alert?.textContent).toBe(reason);
		// The whole point of reporting the rule is that a sighted user can read it.
		expect(alert?.className).not.toContain("sr-only");
		// Still announced, and still tied to the control that was reverted.
		expect(
			container
				.querySelector("[aria-describedby]")
				?.getAttribute("aria-describedby"),
		).toBe(alert?.id);

		await act(async () => root.unmount());
	});
});

describe("TableCellNumberField commit rule", () => {
	async function renderField({
		onCommit,
		value = 275,
	}: {
		onCommit: (next: number) => Promise<void>;
		value?: number;
	}) {
		const container = document.createElement("div");
		document.body.appendChild(container);
		const root = createRoot(container);
		await act(async () => {
			root.render(
				<TableCellNumberField
					aria-label="Gold"
					minValue={0}
					onCommit={onCommit}
					step={1}
					value={value}
				/>,
			);
		});
		const input = container.querySelector("input");
		if (!input) throw new Error("Expected a number input");
		const field = input;

		async function enter(next: string) {
			const setter = Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				"value",
			)?.set;
			await act(async () => {
				field.focus();
				setter?.call(field, next);
				field.dispatchEvent(new Event("input", { bubbles: true }));
				field.blur();
			});
		}

		return { container, root, input, enter };
	}

	it("does not commit a value the row already holds", async () => {
		const onCommit = vi.fn(async () => undefined);
		const { root, enter } = await renderField({ onCommit });

		await enter("275");
		expect(onCommit).not.toHaveBeenCalled();

		await enter("300");
		expect(onCommit).toHaveBeenCalledExactlyOnceWith(300);

		await act(async () => root.unmount());
	});

	it("locks the field while a commit is in flight", async () => {
		let settle: (() => void) | undefined;
		const onCommit = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					settle = resolve;
				}),
		);
		const { root, input, enter } = await renderField({ onCommit });

		await enter("300");
		expect(onCommit).toHaveBeenCalledOnce();
		expect(input.disabled).toBe(true);

		await act(async () => settle?.());
		expect(input.disabled).toBe(false);

		await act(async () => root.unmount());
	});

	it("reverts to the stored value and reports why when a commit is rejected", async () => {
		const onCommit = vi.fn(() =>
			Promise.reject(new Error("Gold cannot go below zero.")),
		);
		const { container, root, input, enter } = await renderField({ onCommit });

		await enter("300");

		expect(container.textContent).toContain("Gold cannot go below zero.");
		expect(input.value).toBe("275");

		await act(async () => root.unmount());
	});
});
