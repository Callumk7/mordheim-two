import { eq } from "drizzle-orm";
import type { Database } from "@/db/index.server";
import { type Clock, systemClock } from "@/db/operations/clock";
import { appSettings } from "@/db/schema";
import {
	IMAGE_GENERATION_INSTRUCTIONS_SETTING_KEY,
	resolveImageGenerationInstructions,
} from "@/db/validation/image-generation";

type SettingsDatabase = Pick<Database, "select" | "insert">;

export async function getImageGenerationInstructions(
	db: SettingsDatabase,
): Promise<{ instructions: string; isCustom: boolean }> {
	const row = await db
		.select({ value: appSettings.value })
		.from(appSettings)
		.where(eq(appSettings.key, IMAGE_GENERATION_INSTRUCTIONS_SETTING_KEY))
		.get();
	const stored = row?.value?.trim();
	if (!stored) {
		return {
			instructions: resolveImageGenerationInstructions(undefined),
			isCustom: false,
		};
	}
	return { instructions: stored, isCustom: true };
}

export async function updateImageGenerationInstructions(
	db: SettingsDatabase,
	instructions: string,
	clock: Clock = systemClock,
) {
	const updatedAt = clock();
	await db
		.insert(appSettings)
		.values({
			key: IMAGE_GENERATION_INSTRUCTIONS_SETTING_KEY,
			value: instructions,
			updatedAt,
		})
		.onConflictDoUpdate({
			target: appSettings.key,
			set: { value: instructions, updatedAt },
		});
	return { instructions, isCustom: true as const, updatedAt };
}
