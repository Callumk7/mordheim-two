import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/button", () => ({
	Button: ({
		children,
		isDisabled,
	}: {
		children: ReactNode;
		isDisabled?: boolean;
	}) => (
		<button type="button" disabled={isDisabled}>
			{children}
		</button>
	),
	LinkButton: ({ children, to }: { children: ReactNode; to: string }) => (
		<a href={to}>{children}</a>
	),
}));

import { AdminPageHeader } from "../admin-page-header";

describe("AdminPageHeader", () => {
	it("renders the campaign title scale and centralized related navigation", () => {
		const markup = renderToStaticMarkup(
			<AdminPageHeader
				currentPage="queue"
				title="Queue playground"
				description="Queue an image-generation job."
			/>,
		);

		expect(markup).toContain("font-mordheim text-4xl sm:text-5xl");
		expect(markup).toContain('aria-label="Related admin pages"');
		expect(markup).toContain('href="/queue-jobs"');
		expect(markup).toContain('href="/generated-images"');
		expect(markup).toContain('href="/settings"');
		expect(markup).not.toContain('href="/queue"');
	});

	it("renders the optional refresh state", () => {
		const markup = renderToStaticMarkup(
			<AdminPageHeader
				currentPage="queue-jobs"
				title="Queue jobs"
				description="Latest jobs"
				isRefreshing
				onRefresh={() => undefined}
			/>,
		);

		expect(markup).toContain("Refreshing…");
		expect(markup).toContain("disabled");
	});
});
