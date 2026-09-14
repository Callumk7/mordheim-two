import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CatalogueItem } from "../catalogue-item";

describe("CatalogueItem", () => {
	it("wraps a details accordion in the Card surface", () => {
		const markup = renderToStaticMarkup(
			<CatalogueItem summary={<span>Sword</span>}>
				<p>Special rules</p>
			</CatalogueItem>,
		);
		expect(markup).toContain('data-slot="card"');
		expect(markup).toContain("<details>");
		expect(markup).toContain("<summary");
		expect(markup).toContain("Sword");
		expect(markup).toContain("Special rules");
		expect(markup).toContain("rounded-2xl");
	});
});
