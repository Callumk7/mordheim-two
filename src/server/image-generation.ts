import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import { enqueueImageGeneration } from "@/db/operations/image-generation.server";
import * as settings from "@/db/operations/image-generation-settings.server";
import {
	ImageGenerationInputSchema,
	ImageGenerationInstructionsInputSchema,
} from "@/db/validation/image-generation";

// Like the existing mutations, this endpoint currently has no application auth.
// Add authorization and rate limiting before enabling paid image generation.
export const createImageGenerationJob = createServerFn({ method: "POST" })
	.validator(ImageGenerationInputSchema)
	.handler(({ data }) =>
		enqueueImageGeneration(getDb(), env.IMAGE_GENERATION_QUEUE, data),
	);

export const getImageGenerationInstructions = createServerFn({
	method: "GET",
}).handler(() => settings.getImageGenerationInstructions(getDb()));

export const updateImageGenerationInstructions = createServerFn({
	method: "POST",
})
	.validator(ImageGenerationInstructionsInputSchema)
	.handler(({ data }) =>
		settings.updateImageGenerationInstructions(getDb(), data.instructions),
	);
