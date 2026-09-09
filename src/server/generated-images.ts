import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import { queryGeneratedImages } from "@/server/generated-images.server";

// No application authentication in this spike; this RPC exposes prompts.
export const listGeneratedImages = createServerFn({ method: "GET" }).handler(
	() => queryGeneratedImages(getDb()),
);
