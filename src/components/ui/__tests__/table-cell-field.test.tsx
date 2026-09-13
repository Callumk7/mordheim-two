// @vitest-environment happy-dom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { TableCellSelect } from "../table-cell-field";

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
		expect(alert?.className).toContain("text-destructive");
		// Still announced, and still tied to the control that was reverted.
		expect(
			container
				.querySelector("[aria-describedby]")
				?.getAttribute("aria-describedby"),
		).toBe(alert?.id);

		await act(async () => root.unmount());
	});
});
