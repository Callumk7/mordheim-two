import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EntityHeader } from "../entity-chrome";

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
