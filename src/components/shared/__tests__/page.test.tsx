import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Page, PageError, PagePending } from "../page";

describe("Page", () => {
	it("renders its content inside a main landmark", () => {
		const markup = renderToStaticMarkup(<Page>Ledger</Page>);
		expect(markup).toContain("<main");
		expect(markup).toContain("Ledger");
	});
});

describe("PagePending", () => {
	it("announces status copy as an output element", () => {
		const markup = renderToStaticMarkup(
			<PagePending>Loading equipment…</PagePending>,
		);
		expect(markup).toContain("<main");
		expect(markup).toContain("<output>Loading equipment…</output>");
	});
});

describe("PageError", () => {
	it("exposes the page shell as an alert landmark", () => {
		const markup = renderToStaticMarkup(
			<PageError>
				<h1>Unable to load equipment</h1>
			</PageError>,
		);
		expect(markup).toContain('role="alert"');
		expect(markup).toContain("Unable to load equipment");
	});
});
