// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MatchStatusActions } from "@/components/shared/match-status-actions";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
	container = document.createElement("div");
	document.body.append(container);
	root = createRoot(container);
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
});

function button(label: string) {
	return [...container.querySelectorAll("button")].find((element) =>
		element.textContent?.includes(label),
	);
}

describe("MatchStatusActions", () => {
	it("starts a scheduled match with the In Progress status", async () => {
		const onStatusChange = vi.fn(async () => undefined);
		await act(async () => {
			root.render(
				<MatchStatusActions
					onOpenCompletion={vi.fn()}
					onStatusChange={onStatusChange}
					status="Scheduled"
				/>,
			);
		});

		expect(button("Start match")).toBeDefined();
		await act(async () => button("Start match")?.click());
		expect(onStatusChange).toHaveBeenCalledWith("InProgress");
	});

	it("marks an in-progress match completed before opening event review", async () => {
		let persist: (() => void) | undefined;
		const onStatusChange = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					persist = resolve;
				}),
		);
		const onOpenCompletion = vi.fn();
		await act(async () => {
			root.render(
				<MatchStatusActions
					onOpenCompletion={onOpenCompletion}
					onStatusChange={onStatusChange}
					status="InProgress"
				/>,
			);
		});

		await act(async () => button("Complete match")?.click());
		expect(onStatusChange).toHaveBeenCalledWith("Completed");
		expect(onOpenCompletion).not.toHaveBeenCalled();

		await act(async () => persist?.());
		expect(onOpenCompletion).toHaveBeenCalledOnce();
	});

	it("lets users reopen event review for a completed match", async () => {
		const onOpenCompletion = vi.fn();
		await act(async () => {
			root.render(
				<MatchStatusActions
					onOpenCompletion={onOpenCompletion}
					onStatusChange={vi.fn()}
					status="Completed"
				/>,
			);
		});

		await act(async () => button("Review match events")?.click());
		expect(onOpenCompletion).toHaveBeenCalledOnce();
	});
});
