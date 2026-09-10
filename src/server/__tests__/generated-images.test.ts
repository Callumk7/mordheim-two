import { afterEach, describe, expect, it, vi } from "vitest";
import {
	queryGeneratedImages,
	serveGeneratedImage,
} from "@/db/operations/generated-images.server";
import {
	jobId,
	jpegBytes,
	setupDatabase,
} from "../../../workers/image-generation/src/test-support";

const connections: ReturnType<typeof setupDatabase>[] = [];
function setup() {
	const connection = setupDatabase();
	connections.push(connection);
	return connection;
}
afterEach(() => {
	for (const { sqlite } of connections.splice(0)) sqlite.close();
});

function bucketWithImage() {
	const body = new Response(jpegBytes).body;
	const get = vi.fn().mockResolvedValue({
		body,
		size: jpegBytes.length,
		httpEtag: '"test-etag"',
		httpMetadata: { contentType: "image/jpeg" },
	});
	return { get };
}

function completedJob() {
	const connection = setup();
	connection.insert("completed");
	connection.sqlite
		.prepare("UPDATE image_generation_jobs SET result_key = ? WHERE id = ?")
		.run(`image-generation/${jobId}.jpg`, jobId);
	return connection;
}

describe("generated image listing", () => {
	it("returns only completed jobs, latest completion first, with deterministic ties and a 100-row limit", async () => {
		const { db, sqlite } = setup();
		const insert = sqlite.prepare(
			"INSERT INTO image_generation_jobs (id, prompt, status, completed_at) VALUES (?, ?, ?, ?)",
		);
		for (let i = 0; i < 102; i++) {
			insert.run(
				String(i).padStart(3, "0"),
				`Prompt ${i}`,
				"completed",
				"2026-01-01T00:00:00.000Z",
			);
		}
		insert.run(
			"newest",
			"Newest portrait",
			"completed",
			"2026-01-02T00:00:00.000Z",
		);
		for (const status of [
			"pending",
			"queued",
			"processing",
			"failed",
			"consumed",
			"enqueue_failed",
		]) {
			insert.run(status, "Not an image", status, "2026-01-03T00:00:00.000Z");
		}
		const images = await queryGeneratedImages(db);
		expect(images).toHaveLength(100);
		expect(images[0]).toEqual({
			id: "newest",
			prompt: "Newest portrait",
			completedAt: "2026-01-02T00:00:00.000Z",
		});
		expect(images[1].id).toBe("101");
		expect(images[99].id).toBe("003");
	});

	it("returns an empty list when no images are completed", async () => {
		const { db, insert } = setup();
		insert("queued");
		expect(await queryGeneratedImages(db)).toEqual([]);
	});

	it("propagates D1 failures to the loader error boundary", async () => {
		const { db, sqlite } = setup();
		sqlite.exec("DROP TABLE image_generation_jobs");
		await expect(queryGeneratedImages(db)).rejects.toThrow();
	});
});

describe("generated image serving", () => {
	it("streams a completed job's JPEG with content headers", async () => {
		const { db } = completedJob();
		const bucket = bucketWithImage();
		const response = await serveGeneratedImage(db, bucket, jobId);
		expect(response.status).toBe(200);
		expect(bucket.get).toHaveBeenCalledExactlyOnceWith(
			`image-generation/${jobId}.jpg`,
		);
		expect(response.headers.get("Content-Type")).toBe("image/jpeg");
		expect(response.headers.get("Content-Length")).toBe(
			String(jpegBytes.length),
		);
		expect(response.headers.get("ETag")).toBe('"test-etag"');
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(jpegBytes);
	});

	it.each([
		"missing",
		"pending",
		"queued",
		"processing",
		"failed",
		"consumed",
		"enqueue_failed",
	])("returns 404 for a %s job without reading R2", async (status) => {
		const { db, insert } = setup();
		if (status !== "missing") insert(status);
		const bucket = bucketWithImage();
		expect((await serveGeneratedImage(db, bucket, jobId)).status).toBe(404);
		expect(bucket.get).not.toHaveBeenCalled();
	});

	it.each([
		null,
		"other/private.jpg",
	])("rejects an absent or unexpected result key (%s)", async (key) => {
		const { db, sqlite } = completedJob();
		sqlite.prepare("UPDATE image_generation_jobs SET result_key = ?").run(key);
		const bucket = bucketWithImage();
		expect((await serveGeneratedImage(db, bucket, jobId)).status).toBe(404);
		expect(bucket.get).not.toHaveBeenCalled();
	});

	it("returns 404 when the R2 object is missing", async () => {
		const { db } = completedJob();
		const response = await serveGeneratedImage(
			db,
			{ get: vi.fn().mockResolvedValue(null) },
			jobId,
		);
		expect(response.status).toBe(404);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
	});

	it("does not serve non-JPEG objects", async () => {
		const { db } = completedJob();
		const cancel = vi.fn();
		const bucket = {
			get: vi.fn().mockResolvedValue({
				httpMetadata: { contentType: "text/html" },
				body: { cancel },
			}),
		};
		expect((await serveGeneratedImage(db, bucket, jobId)).status).toBe(502);
		expect(cancel).toHaveBeenCalledOnce();
	});

	it("sanitizes R2 failures", async () => {
		const { db } = completedJob();
		const response = await serveGeneratedImage(
			db,
			{ get: vi.fn().mockRejectedValue(new Error("private storage details")) },
			jobId,
		);
		expect(response.status).toBe(503);
		expect(await response.text()).toBe("Image temporarily unavailable");
	});

	it("sanitizes D1 failures without reading R2", async () => {
		const { db, sqlite } = setup();
		sqlite.exec("DROP TABLE image_generation_jobs");
		const bucket = bucketWithImage();
		const response = await serveGeneratedImage(db, bucket, jobId);
		expect(response.status).toBe(503);
		expect(await response.text()).toBe("Image temporarily unavailable");
		expect(bucket.get).not.toHaveBeenCalled();
	});
});
