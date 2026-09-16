// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EntityImagePicker } from "@/components/shared/entity-image-picker";
import type { GeneratedImageJob } from "@/components/shared/generated-image-status";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const testState = vi.hoisted(() => {
	const invalidate = vi.fn(async () => undefined);
	return { invalidate, router: { invalidate } };
});

vi.mock("@tanstack/react-router", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-router")>()),
	useRouter: () => testState.router,
}));

vi.mock("@/components/ui/dialog", () => ({
	DialogTrigger: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
	Dialog: () => null,
	DialogTitle: () => null,
	DialogDescription: () => null,
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
}));

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
	container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
	testState.invalidate.mockClear();
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
	vi.useRealTimers();
});

function job(
	status: GeneratedImageJob["status"],
	jobId = `job-${status}`,
): GeneratedImageJob {
	return { jobId, status, error: null };
}

async function renderPicker({
	active = null,
	history = [],
}: {
	active?: GeneratedImageJob | null;
	history?: GeneratedImageJob[];
} = {}) {
	await act(async () => {
		root.render(
			<EntityImagePicker
				active={active}
				alt="Portrait of Marta"
				emptyDescription="No portrait is selected."
				history={history}
				label="Portrait"
				onGenerate={async () => ({})}
				onSelect={async () => ({})}
			/>,
		);
	});
}

describe("EntityImagePicker", () => {
	it("polls first-generation progress while the history dialog is closed", async () => {
		vi.useFakeTimers();
		await renderPicker({
			history: [job("queued", "portrait-1")],
		});

		expect(
			container.querySelector('output[aria-live="polite"]')?.textContent,
		).toMatch(/queued for generation/i);
		expect(container.textContent).not.toContain("No portrait is selected.");

		await act(async () => vi.advanceTimersByTimeAsync(3_000));
		expect(testState.invalidate).toHaveBeenCalledWith({ sync: true });
	});

	it("keeps the empty state when nothing is selected or in flight", async () => {
		vi.useFakeTimers();
		await renderPicker();

		expect(container.textContent).toContain("No portrait is selected.");
		expect(container.querySelector('output[aria-live="polite"]')).toBeNull();

		await act(async () => vi.advanceTimersByTimeAsync(3_000));
		expect(testState.invalidate).not.toHaveBeenCalled();
	});
});
