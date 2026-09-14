import { Coins } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdjustedBadge, HeroStat, StatTile } from "../stat-display";

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

describe("StatTile", () => {
	it("renders the campaign metric card with a suffix and adjustment", () => {
		const markup = renderToStaticMarkup(
			<StatTile adjustment={1} label="Win rate" suffix="%" value={50} />,
		);
		expect(markup).toContain('data-slot="card"');
		expect(markup).toContain("font-mordheim text-4xl");
		expect(markup).toContain("Win rate");
		expect(markup).toContain("50");
		expect(markup).toContain("%");
		expect(markup).toContain("Adjusted by +1");
	});

	it("renders the compact muted tile used inside existing cards", () => {
		const markup = renderToStaticMarkup(
			<StatTile label="KDs given" value={4} variant="compact" />,
		);
		expect(markup).toContain("<dt");
		expect(markup).toContain("<dd");
		expect(markup).toContain("font-mono");
		expect(markup).toContain("bg-muted/40");
		expect(markup).not.toContain('data-slot="card"');
		expect(markup).not.toContain("font-mordheim");
	});
});

describe("HeroStat", () => {
	it("keeps the warband hero divider breakpoints", () => {
		const markup = renderToStaticMarkup(
			<HeroStat icon={Coins} label="Gold crowns" value={120} />,
		);
		expect(markup).toContain("sm:[&amp;:not(:nth-child(odd))]:border-l");
		expect(markup).toContain("lg:[&amp;:not(:first-child)]:border-l");
		expect(markup).toContain("Gold crowns");
		expect(markup).toContain("120");
	});
});
