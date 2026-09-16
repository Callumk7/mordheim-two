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
	selectWarriorPortrait: {},
}));

vi.mock("@/components/ui/dialog", () => ({
	DialogTrigger: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
	Dialog: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	DialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h2>{children}</h2>
	),
	DialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p>{children}</p>
	),
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

function renderPortrait(
	portrait: React.ComponentProps<typeof WarriorPortrait>["portrait"] = {
		job: null,
		history: [],
	},
) {
	return act(async () => {
		root.render(
			<WarriorPortrait
				name="Marta"
				portrait={portrait}
				warriorId="warrior-1"
			/>,
		);
	});
}

describe("WarriorPortrait", () => {
	it("submits a new job and refreshes without treating pending history as active", async () => {
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
		expect(container.querySelector('output[aria-live="polite"]')).toBeNull();
		expect(container.textContent).toContain("Generate portrait");
		expect(container.textContent).not.toMatch(/refresh/i);
		expect(testState.invalidate).toHaveBeenCalledWith({ sync: true });
	});

	it("shows completed, in-progress, and sanitized failed history only in the picker", async () => {
		await renderPortrait({
			job: {
				jobId: "completed-1",
				status: "completed",
				error: null,
			},
			history: [
				{ jobId: "completed-1", status: "completed", error: null },
				{ jobId: "pending-1", status: "processing", error: null },
				{ jobId: "failed-1", status: "failed", error: "secret abc123" },
			],
		});
		expect(document.body.textContent).toContain("Choose image");
		expect(document.body.textContent).toContain("Currently selected");
		expect(document.body.textContent).toContain("Generating image");
		expect(document.body.textContent).toContain("generation failed");
		expect(document.body.textContent).not.toContain("abc123");
		expect(document.body.textContent?.match(/Not selectable/g)).toHaveLength(2);
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
