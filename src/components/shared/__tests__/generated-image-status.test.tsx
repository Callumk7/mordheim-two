// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type GeneratedImageJob,
	GeneratedImageStatus,
} from "@/components/shared/generated-image-status";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const testState = vi.hoisted(() => {
	const invalidate = vi.fn(async () => undefined);
	return { invalidate, router: { invalidate } };
});

vi.mock("@tanstack/react-router", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-router")>()),
	useRouter: () => testState.router,
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
	error: string | null = null,
): GeneratedImageJob {
	return { jobId: `job-${status}`, status, error };
}

async function renderStatus(
	status: GeneratedImageJob["status"],
	error: string | null = null,
) {
	await act(async () => {
		root.render(
			<GeneratedImageStatus
				alt="A generated scene"
				job={job(status, error)}
				label="Illustration"
			/>,
		);
	});
}

describe("GeneratedImageStatus", () => {
	it.each<GeneratedImageJob["status"]>([
		"pending",
		"queued",
		"processing",
	])("renders an accessible active indicator for %s", async (status: GeneratedImageJob["status"]) => {
		await renderStatus(status);

		const indicator = container.querySelector('output[aria-live="polite"]');
		expect(indicator?.tagName).toBe("OUTPUT");
		expect(indicator?.textContent).toMatch(/illustration/i);
		expect(indicator?.textContent).toMatch(/waiting|queued|generating/i);
		expect(container.textContent).not.toMatch(/refresh/i);
	});

	it.each<GeneratedImageJob["status"]>([
		"failed",
		"enqueue_failed",
		"consumed",
	])("renders understandable alert UI for %s without exposing worker errors", async (status: GeneratedImageJob["status"]) => {
		await renderStatus(status, "secret provider token: abc123");

		const alert = container.querySelector('[role="alert"]');
		expect(alert?.textContent).toMatch(/illustration/i);
		expect(alert?.textContent).toMatch(/failed|queue|available/i);
		expect(alert?.textContent).not.toContain("abc123");
	});

	it("handles a completed image load error without recommending refresh", async () => {
		await renderStatus("completed");
		const image = container.querySelector("img");
		expect(image?.alt).toBe("A generated scene");

		await act(async () => image?.dispatchEvent(new Event("error")));
		expect(container.querySelector('[role="alert"]')?.textContent).toMatch(
			/could not be displayed/i,
		);
		expect(container.textContent).not.toMatch(/refresh/i);
	});

	it("polls active jobs, shares one timer, and stops when jobs become terminal", async () => {
		vi.useFakeTimers();
		await act(async () => {
			root.render(
				<>
					<GeneratedImageStatus alt="One" job={job("queued")} label="One" />
					<GeneratedImageStatus alt="Two" job={job("processing")} label="Two" />
				</>,
			);
		});

		await act(async () => vi.advanceTimersByTimeAsync(3_000));
		expect(testState.invalidate).toHaveBeenCalledTimes(1);
		expect(testState.invalidate).toHaveBeenCalledWith({ sync: true });

		await act(async () => {
			root.render(
				<GeneratedImageStatus alt="One" job={job("completed")} label="One" />,
			);
		});
		await act(async () => vi.advanceTimersByTimeAsync(6_000));
		expect(testState.invalidate).toHaveBeenCalledTimes(1);
	});

	it("cleans polling up on unmount and at the two-minute ceiling", async () => {
		vi.useFakeTimers();
		await renderStatus("pending");

		await act(async () => vi.advanceTimersByTimeAsync(120_000));
		const callsAtCeiling = testState.invalidate.mock.calls.length;
		expect(callsAtCeiling).toBeGreaterThan(0);
		await act(async () => vi.advanceTimersByTimeAsync(9_000));
		expect(testState.invalidate).toHaveBeenCalledTimes(callsAtCeiling);

		await act(async () => root.unmount());
		root = createRoot(container);
		await renderStatus("processing");
		await act(async () => vi.advanceTimersByTimeAsync(3_000));
		const callsBeforeUnmount = testState.invalidate.mock.calls.length;
		await act(async () => root.unmount());
		await act(async () => vi.advanceTimersByTimeAsync(9_000));
		expect(testState.invalidate).toHaveBeenCalledTimes(callsBeforeUnmount);
		root = createRoot(container);
	});
});
