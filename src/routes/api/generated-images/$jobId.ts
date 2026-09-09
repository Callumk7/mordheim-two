import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/db/index.server";
import { serveGeneratedImage } from "@/server/generated-images.server";

export const Route = createFileRoute("/api/generated-images/$jobId")({
	server: {
		handlers: {
			GET: ({ params }) =>
				serveGeneratedImage(getDb(), env.IMAGE_GENERATION_BUCKET, params.jobId),
		},
	},
});
