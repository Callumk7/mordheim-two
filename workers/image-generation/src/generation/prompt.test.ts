import { describe, expect, it } from "vitest";
import { prepareImagePrompt } from "./prompt";

describe("prepareImagePrompt", () => {
	it("applies the shared style instruction once", () => {
		expect(prepareImagePrompt("portrait")).toBe(
			"portrait\n\nCreate the image in the style of John Blanche.",
		);
	});
});
