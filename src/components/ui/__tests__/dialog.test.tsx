import { describe, expect, it } from "vitest";
import { dialogContentVariants } from "../dialog";

describe("dialogContentVariants", () => {
	it("defaults form dialogs to the shared max height and width", () => {
		const className = dialogContentVariants();
		expect(className).toContain("max-h-[calc(100vh-2rem)]");
		expect(className).toContain("overflow-y-auto");
		expect(className).toContain("sm:max-w-2xl");
		expect(className).not.toContain("sm:max-w-md");
	});

	it("keeps the documented wider variants", () => {
		expect(dialogContentVariants({ size: "lg" })).toContain("sm:max-w-3xl");
		expect(dialogContentVariants({ size: "xl" })).toContain("sm:max-w-4xl");
		expect(dialogContentVariants({ size: "lg" })).not.toContain("sm:max-w-2xl");
		expect(dialogContentVariants({ size: "xl" })).not.toContain("sm:max-w-2xl");
	});
});
