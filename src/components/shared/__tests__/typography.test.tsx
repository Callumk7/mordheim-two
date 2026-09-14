import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Typography } from "../typography";

describe("Typography", () => {
	it("applies the documented role classes", () => {
		expect(
			renderToStaticMarkup(<Typography variant="display">Home</Typography>),
		).toContain("font-mordheim text-5xl sm:text-7xl");
		expect(
			renderToStaticMarkup(<Typography variant="pageTitle">Title</Typography>),
		).toContain("font-mordheim text-4xl sm:text-5xl");
		expect(
			renderToStaticMarkup(
				<Typography variant="sectionTitle">Section</Typography>,
			),
		).toContain("font-mordheim text-2xl");
		expect(
			renderToStaticMarkup(<Typography variant="eyebrow">Label</Typography>),
		).toContain(
			"text-xs font-semibold uppercase tracking-[0.28em] text-primary",
		);
		expect(
			renderToStaticMarkup(
				<Typography variant="destructiveEyebrow">Danger</Typography>,
			),
		).toContain(
			"text-xs font-semibold uppercase tracking-[0.28em] text-destructive",
		);
		expect(
			renderToStaticMarkup(
				<Typography variant="supportingBody">Help</Typography>,
			),
		).toContain("text-muted-foreground text-sm");
		expect(
			renderToStaticMarkup(<Typography variant="displayBody">Lead</Typography>),
		).toContain("text-lg leading-8");
	});

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
