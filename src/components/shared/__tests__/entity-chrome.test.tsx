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
		<button disabled={isDisabled} type="button">
			{children}
		</button>
	),
	LinkButton: ({ children }: { children: ReactNode }) => (
		<a href="/">{children}</a>
	),
}));

import { DestructiveConfirm, EntityHeader } from "../entity-chrome";

describe("EntityHeader", () => {
	it("keeps the entity title as the page heading and exposes optional slots", () => {
		const markup = renderToStaticMarkup(
			<EntityHeader
				actions={<button type="button">Edit match</button>}
				description="Review this encounter."
				eyebrow="Campaign match"
				leading={<span>Completed</span>}
				title="The Great Library"
			/>,
		);

		expect(markup).toContain("<h1");
		expect(markup).toContain("The Great Library");
		expect(markup).toContain("Campaign match");
		expect(markup).toContain("Review this encounter.");
		expect(markup).toContain("Completed");
		expect(markup).toContain("Edit match");
	});
});

describe("DestructiveConfirm", () => {
	it("keeps pending precedence, disabled state, and the optional error slot", () => {
		const pending = renderToStaticMarkup(
			<DestructiveConfirm
				cancelLink={{ to: "/warbands" }}
				description="This cannot be undone."
				error="Unable to delete warband."
				isDisabled
				isPending
				keepLabel="Keep warband"
				onConfirm={() => undefined}
				pendingLabel="Deleting…"
				submitLabel="Delete warband"
				title="Delete warband?"
			/>,
		);
		expect(pending).toMatch(/<button[^>]*disabled[^>]*>Deleting…<\/button>/);
		expect(pending).toContain("Unable to delete warband.");

		const ready = renderToStaticMarkup(
			<DestructiveConfirm
				cancelLink={{ to: "/warbands" }}
				description="This cannot be undone."
				keepLabel="Keep warband"
				onConfirm={() => undefined}
				pendingLabel="Deleting…"
				submitLabel="Delete warband"
				title="Delete warband?"
			/>,
		);
		expect(ready).toMatch(
			/<button(?![^>]*disabled)[^>]*>Delete warband<\/button>/,
		);
		expect(ready).not.toContain("Unable to delete warband.");
	});
});
