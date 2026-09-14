import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmptyState } from "../empty-state";

describe("EmptyState", () => {
	it("supports index and dashboard surfaces without changing heading semantics", () => {
		const index = renderToStaticMarkup(
			<EmptyState
				description="Create the first company."
				title="No warbands yet"
			/>,
		);
		expect(index).toContain("rounded-xl px-6 py-16");
		expect(index).toContain("<h2");

		const dashboard = renderToStaticMarkup(
			<EmptyState
				description="Recruit a fighter."
				icon={<span>Shield</span>}
				title="No living warriors"
				titleAs="h3"
				variant="dashboard"
			/>,
		);
		expect(dashboard).toContain("rounded-2xl bg-card/40 px-6 py-10");
		expect(dashboard).toContain("<h3");
		expect(dashboard).toContain("Shield");
	});

	it("renders optional actions in a shared slot", () => {
		const markup = renderToStaticMarkup(
			<EmptyState action={<button type="button">Edit participants</button>} />,
		);
		expect(markup).toContain("Edit participants");
		expect(markup).toContain("mt-5");
	});
});
