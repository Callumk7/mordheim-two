import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import { enqueueImageGeneration } from "@/db/operations/image-generation.server";
import { ImageGenerationInputSchema } from "@/db/validation/image-generation";

// Like the existing mutations, this endpoint currently has no application auth.
// Add authorization and rate limiting before enabling paid image generation.
export const createImageGenerationJob = createServerFn({ method: "POST" })
	.validator(ImageGenerationInputSchema)
	.handler(({ data }) =>
		enqueueImageGeneration(getDb(), env.IMAGE_GENERATION_QUEUE, data.prompt),
	);
