import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db/index.server";
import { queryProjectorImages } from "@/db/operations/generated-images.server";

// The projector is part of the same deliberately unauthenticated image spike.
// Protect it with the rest of the image-generation surface before production.
export const getProjectorImages = createServerFn({ method: "GET" }).handler(
	() => queryProjectorImages(getDb()),
);
