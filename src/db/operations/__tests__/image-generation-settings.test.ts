import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	getImageGenerationInstructions,
	updateImageGenerationInstructions,
} from "@/db/operations/image-generation-settings.server";
import { appSettings } from "@/db/schema";
import {
	DEFAULT_IMAGE_GENERATION_INSTRUCTIONS,
	IMAGE_GENERATION_INSTRUCTIONS_SETTING_KEY,
} from "@/db/validation/image-generation";
import { clock, updatedAt } from "./fixtures";
import { createTestDatabase } from "./test-database";

let connection: Awaited<ReturnType<typeof createTestDatabase>>;
beforeEach(async () => {
	connection = await createTestDatabase();
}, 30_000);
afterEach(async () => {
	await connection?.dispose();
});

describe("image generation settings on local D1", () => {
	it("returns the default brief when no setting has been saved", async () => {
		const { db } = connection;
		expect(await getImageGenerationInstructions(db)).toEqual({
			instructions: DEFAULT_IMAGE_GENERATION_INSTRUCTIONS,
			isCustom: false,
		});
	});

	it("upserts instructions and returns the saved value on later reads", async () => {
		const { db } = connection;
		const first = await updateImageGenerationInstructions(
			db,
			"Paint like a woodcut.",
			clock,
		);
		expect(first).toEqual({
			instructions: "Paint like a woodcut.",
			isCustom: true,
			updatedAt,
		});
		expect(await getImageGenerationInstructions(db)).toEqual({
			instructions: "Paint like a woodcut.",
			isCustom: true,
		});

		const second = await updateImageGenerationInstructions(
			db,
			"Use muted earth tones only.",
			clock,
		);
		expect(second.instructions).toBe("Use muted earth tones only.");
		expect(await getImageGenerationInstructions(db)).toEqual({
			instructions: "Use muted earth tones only.",
			isCustom: true,
		});

		const rows = await db.select().from(appSettings);
		expect(rows).toEqual([
			{
				key: IMAGE_GENERATION_INSTRUCTIONS_SETTING_KEY,
				value: "Use muted earth tones only.",
				updatedAt,
			},
		]);
	});
});
