// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WarriorPortrait } from "@/components/warrior-portrait";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const testState = vi.hoisted(() => {
	const invalidate = vi.fn(async () => undefined);
	return {
		invalidate,
		router: { invalidate },
		submit: vi.fn(),
	};
});

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => testState.router,
}));

vi.mock("@tanstack/react-start", () => ({
	useServerFn: () => testState.submit,
}));

vi.mock("@/server/warrior-portraits", () => ({
	createWarriorPortrait: {},
}));

vi.mock("@/components/ui/button", () => ({
	Button: ({ children, isDisabled, onPress }: Record<string, unknown>) => (
		<button
			disabled={Boolean(isDisabled)}
			onClick={() => void (onPress as () => Promise<void>)()}
			type="button"
		>
			{children as React.ReactNode}
		</button>
	),
	LinkButton: ({ children }: { children: React.ReactNode }) => (
		<a href="/queue-jobs">{children}</a>
	),
}));

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
	container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
	testState.invalidate.mockClear();
	testState.submit.mockReset();
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
});

function renderPortrait() {
	return act(async () => {
		root.render(
			<WarriorPortrait
				name="Marta"
				portrait={{ job: null }}
				warriorId="warrior-1"
			/>,
		);
	});
}

describe("WarriorPortrait", () => {
	it("transitions from submitting to an active polling status without refresh instructions", async () => {
		let finish: ((value: unknown) => void) | undefined;
		testState.submit.mockReturnValue(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		await renderPortrait();

		await act(async () => container.querySelector("button")?.click());
		expect(container.textContent).toContain("Submitting…");

		await act(async () => {
			finish?.({
				job: { jobId: "portrait-1", status: "queued", error: null },
			});
		});
		expect(
			container.querySelector('output[aria-live="polite"]')?.textContent,
		).toMatch(/portrait.*queued/i);
		expect(container.textContent).not.toMatch(/refresh/i);
		expect(testState.invalidate).toHaveBeenCalledWith({ sync: true });
	});

	it("keeps submission errors understandable and retryable", async () => {
		testState.submit.mockResolvedValue({
			error: "Portrait could not be queued.",
		});
		await renderPortrait();
		await act(async () => container.querySelector("button")?.click());

		expect(container.querySelector('[role="alert"]')?.textContent).toContain(
			"Portrait could not be queued.",
		);
		expect(container.querySelector("button")?.disabled).toBe(false);
	});
});
