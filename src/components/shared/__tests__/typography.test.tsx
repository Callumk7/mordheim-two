import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Typography } from "../typography";

describe("Typography", () => {
	it("renders a semantic default element for each role", () => {
		expect(
			renderToStaticMarkup(<Typography variant="pageTitle">Title</Typography>),
		).toContain("<h1");
		expect(
			renderToStaticMarkup(
				<Typography variant="sectionTitle">Section</Typography>,
			),
		).toContain("<h2");
		expect(
			renderToStaticMarkup(<Typography variant="eyebrow">Label</Typography>),
		).toContain("<p");
	});

	it("lets as override the default element", () => {
		const markup = renderToStaticMarkup(
			<Typography as="h3" variant="sectionTitle">
				Empty
			</Typography>,
		);
		expect(markup).toContain("<h3");
		expect(markup).not.toContain("<h2");
	});
});
