import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Page, PageError, PagePending } from "../page";

describe("Page", () => {
	it("renders a main landmark with the campaign width and padding", () => {
		const markup = renderToStaticMarkup(<Page>Ledger</Page>);
		expect(markup).toContain("<main");
		expect(markup).toContain("max-w-6xl");
		expect(markup).toContain("px-4");
		expect(markup).toContain("py-10");
		expect(markup).toContain("sm:px-8");
		expect(markup).toContain("Ledger");
	});

	it("applies documented width and padding variants", () => {
		expect(renderToStaticMarkup(<Page width="narrow" />)).toContain(
			"max-w-3xl",
		);
		expect(renderToStaticMarkup(<Page width="form" />)).toContain("max-w-2xl");
		expect(renderToStaticMarkup(<Page width="wide" />)).toContain("max-w-7xl");
		expect(renderToStaticMarkup(<Page padding="loose" />)).toContain(
			"py-16 sm:py-24",
		);
	});
});

describe("PagePending", () => {
	it("wraps status copy in the campaign shell", () => {
		const markup = renderToStaticMarkup(
			<PagePending>Loading equipment…</PagePending>,
		);
		expect(markup).toContain("<main");
		expect(markup).toContain("max-w-6xl");
		expect(markup).toContain("<output>Loading equipment…</output>");
	});
});

describe("PageError", () => {
	it("uses the campaign shell as an alert landmark", () => {
		const markup = renderToStaticMarkup(
			<PageError>
				<h1>Unable to load equipment</h1>
			</PageError>,
		);
		expect(markup).toContain('role="alert"');
		expect(markup).toContain("max-w-6xl");
		expect(markup).toContain("Unable to load equipment");
	});
});
