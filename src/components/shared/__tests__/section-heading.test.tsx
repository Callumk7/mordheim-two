import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SectionHeading } from "../section-heading";

describe("SectionHeading", () => {
	it("renders the campaign eyebrow, section title, and supporting copy", () => {
		const markup = renderToStaticMarkup(
			<SectionHeading
				description="Results are calculated from completed matches."
				eyebrow="Campaign performance"
				id="record-heading"
				title="Match record"
			/>,
		);
		expect(markup).toContain("Campaign performance");
		expect(markup).toContain("Match record");
		expect(markup).toContain("Results are calculated from completed matches.");
		expect(markup).toContain('id="record-heading"');
		expect(markup).toContain("font-mordheim text-2xl");
		expect(markup).toContain("tracking-[0.28em]");
	});
});
