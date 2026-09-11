import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdjustedBadge } from "../stat-display";

describe("AdjustedBadge", () => {
	it("renders an accessible indicator for positive and negative corrections", () => {
		for (const [adjustment, accessibleText] of [
			[2, "Adjusted by +2"],
			[-1, "Adjusted by -1"],
		] as const) {
			const markup = renderToStaticMarkup(
				<AdjustedBadge adjustment={adjustment} />,
			);
			expect(markup).toContain("Adjusted");
			expect(markup).toContain(accessibleText);
		}
	});

	it("does not mark a zero correction as adjusted", () => {
		expect(renderToStaticMarkup(<AdjustedBadge adjustment={0} />)).toBe("");
	});
});
