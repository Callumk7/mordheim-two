import { afterEach, describe, expect, it } from "vitest";
import {
	getImageGenerationInstructions,
	updateImageGenerationInstructions,
} from "@/db/operations/image-generation-settings.server";
import {
	DEFAULT_IMAGE_GENERATION_INSTRUCTIONS,
	GEMINI_IMAGE_MODEL,
	IMAGE_GENERATION_INSTRUCTIONS_MAX_LENGTH,
	ImageGenerationInputSchema,
	ImageGenerationInstructionsInputSchema,
	OPENAI_IMAGE_MODEL,
	resolveImageGenerationInstructions,
} from "@/db/validation/image-generation";
import { setupDatabase } from "../../../workers/image-generation/src/test-support";

const connections: ReturnType<typeof setupDatabase>[] = [];
function setup() {
	const connection = setupDatabase();
	connections.push(connection);
	return connection;
}
afterEach(() => {
	for (const { sqlite } of connections.splice(0)) sqlite.close();
});

describe("image generation instructions", () => {
	it("rejects empty, whitespace, and over-limit instructions", () => {
		for (const instructions of [
			"",
			"   ",
			"x".repeat(IMAGE_GENERATION_INSTRUCTIONS_MAX_LENGTH + 1),
		]) {
			expect(
				ImageGenerationInstructionsInputSchema.safeParse({ instructions })
					.success,
			).toBe(false);
		}
		expect(
			ImageGenerationInstructionsInputSchema.parse({
				instructions: "  Paint like a woodcut.  ",
			}),
		).toEqual({ instructions: "Paint like a woodcut." });
	});

	it("falls back to the default brief when unset", () => {
		expect(resolveImageGenerationInstructions(undefined)).toBe(
			DEFAULT_IMAGE_GENERATION_INSTRUCTIONS,
		);
		expect(resolveImageGenerationInstructions("   ")).toBe(
			DEFAULT_IMAGE_GENERATION_INSTRUCTIONS,
		);
		expect(resolveImageGenerationInstructions("Custom brief")).toBe(
			"Custom brief",
		);
	});

	it("surfaces D1 failures from read and write operations", async () => {
		const { db, sqlite } = setup();
		sqlite.exec("DROP TABLE app_settings");

		await expect(getImageGenerationInstructions(db)).rejects.toThrow();
		await expect(
			updateImageGenerationInstructions(db, "Paint like a woodcut."),
		).rejects.toThrow();
	});
});

describe("image generation input", () => {
	it("trims prompts, defaults the model, and validates explicit models", () => {
		expect(
			ImageGenerationInputSchema.parse({ prompt: "  A portrait  " }),
		).toEqual({ prompt: "A portrait", model: GEMINI_IMAGE_MODEL });
		expect(
			ImageGenerationInputSchema.parse({
				prompt: "A portrait",
				model: OPENAI_IMAGE_MODEL,
			}),
		).toMatchObject({ model: OPENAI_IMAGE_MODEL });
		for (const prompt of ["", "   ", "x".repeat(4001)]) {
			expect(ImageGenerationInputSchema.safeParse({ prompt }).success).toBe(
				false,
			);
		}
		expect(
			ImageGenerationInputSchema.safeParse({
				prompt: "A portrait",
				model: "unknown",
			}).success,
		).toBe(false);
	});
});
