import { describe, expect, it } from "vitest";
import {
	GEMINI_IMAGE_MODEL,
	OPENAI_IMAGE_MODEL,
} from "@/db/validation/image-generation";
import { createImageGeneratorRegistry } from "./registry";

describe("image generator registry", () => {
	it.each([
		[GEMINI_IMAGE_MODEL, { GEMINI_API_KEY: "gemini-key" }],
		[OPENAI_IMAGE_MODEL, { OPENAI_API_KEY: "openai-key" }],
	] as const)("dispatches %s without requiring the other secret", (model, env) => {
		expect(createImageGeneratorRegistry(env)(model).model).toBe(model);
	});

	it.each([
		[GEMINI_IMAGE_MODEL, "GEMINI_API_KEY"],
		[OPENAI_IMAGE_MODEL, "OPENAI_API_KEY"],
	] as const)("sanitizes a missing secret for %s", (model, secret) => {
		expect(() => createImageGeneratorRegistry({})(model)).toThrow(
			`Consumer ${secret} is not configured.`,
		);
	});

	it("permanently rejects unsupported persisted models", () => {
		try {
			createImageGeneratorRegistry({})("unknown");
			throw new Error("Expected registry failure");
		} catch (error) {
			expect(error).toMatchObject({
				message: "Unsupported image generation model.",
				permanent: true,
			});
		}
	});
});
