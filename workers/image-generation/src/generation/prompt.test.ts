import { describe, expect, it } from "vitest";
import { IMAGE_PROMPT_REFINEMENT_INSTRUCTIONS } from "./prompt";

describe("image prompt refinement instructions", () => {
	it("moves John Blanche styling into the refiner brief", () => {
		expect(IMAGE_PROMPT_REFINEMENT_INSTRUCTIONS).toContain(
			"John Blanche's style",
		);
		expect(IMAGE_PROMPT_REFINEMENT_INSTRUCTIONS).toContain(
			"Treat labeled fields as facts",
		);
		expect(IMAGE_PROMPT_REFINEMENT_INSTRUCTIONS).toContain(
			"Reply with only the image prompt",
		);
	});
});
