import { describe, expect, it } from "vitest";
import { campaignTypography } from "@/components/shared/typography";

describe("campaign typography", () => {
	it("keeps the documented role classes stable", () => {
		expect(campaignTypography).toEqual({
			display: "font-mordheim text-5xl sm:text-7xl",
			pageTitle: "font-mordheim text-4xl sm:text-5xl",
			sectionTitle: "font-mordheim text-2xl",
			eyebrow: "text-xs font-semibold uppercase tracking-[0.28em] text-primary",
			supportingBody: "text-muted-foreground text-sm",
			displayBody: "text-lg leading-8",
		});
	});
});
