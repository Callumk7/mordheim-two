import { and, desc, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { imageGenerationJobs as jobs } from "@/db/schema";

export function queryGeneratedImages(db: Pick<DrizzleD1Database, "select">) {
	return db
		.select({ id: jobs.id, prompt: jobs.prompt, completedAt: jobs.completedAt })
		.from(jobs)
		.where(eq(jobs.status, "completed"))
		.orderBy(desc(jobs.completedAt), desc(jobs.id))
		.limit(100)
		.all();
}

// Deliberately unprotected for the spike. A private bucket does not make this
// endpoint private; protect both this handler and the listing before production.
export async function serveGeneratedImage(
	db: Pick<DrizzleD1Database, "select">,
	bucket: Pick<R2Bucket, "get">,
	jobId: string,
): Promise<Response> {
	const headers = new Headers({
		"Cache-Control": "no-store",
		"X-Content-Type-Options": "nosniff",
	});
	try {
		const job = await db
			.select({ resultKey: jobs.resultKey })
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.status, "completed")))
			.get();
		if (!job?.resultKey || job.resultKey !== `image-generation/${jobId}.jpg`) {
			return new Response("Image not found", { status: 404, headers });
		}
		const object = await bucket.get(job.resultKey);
		if (!object) {
			return new Response("Image not found", { status: 404, headers });
		}
		if (object.httpMetadata?.contentType !== "image/jpeg") {
			await object.body.cancel();
			return new Response("Image unavailable", { status: 502, headers });
		}
		headers.set("Content-Type", "image/jpeg");
		headers.set("Content-Length", String(object.size));
		headers.set("ETag", object.httpEtag);
		return new Response(object.body, { headers });
	} catch {
		return new Response("Image temporarily unavailable", {
			status: 503,
			headers,
		});
	}
}
