import { afterEach, describe, expect, it } from "vitest";
import type { Database } from "@/db/index.server";
import { enqueueImageGeneration } from "@/db/operations/image-generation.server";
import { GEMINI_IMAGE_MODEL } from "@/db/validation/image-generation";
import { jobId, setupDatabase } from "../test-support";
import { LEASE_MS } from "./job-store";

const connections: ReturnType<typeof setupDatabase>[] = [];
function setup(now?: () => number) {
	const connection = setupDatabase(now);
	connections.push(connection);
	return connection;
}
afterEach(() => {
	for (const { sqlite } of connections.splice(0)) sqlite.close();
});

const result = {
	resultKey: "key",
	resultMimeType: "image/jpeg",
	resultBytes: 68,
	resultEtag: "etag",
	resultModel: "model",
};

describe("image job atomic lease", () => {
	it.each([
		"pending",
		"queued",
		"enqueue_failed",
	])("claims %s and rejects concurrent claims", async (status) => {
		const { jobs, insert } = setup();
		insert(status);
		const claims = await Promise.all([
			jobs.claim(jobId, "one"),
			jobs.claim(jobId, "two"),
		]);
		expect(claims.filter(Boolean)).toHaveLength(1);
		expect((await jobs.load(jobId))?.status).toBe("processing");
	});
	it("reclaims only expired leases and fences stale D1 writes", async () => {
		let now = 1_000_000;
		const { jobs, insert } = setup(() => now);
		insert();
		await jobs.claim(jobId, "old");
		now += LEASE_MS - 1;
		expect(await jobs.claim(jobId, "new")).toBeUndefined();
		now++;
		expect(await jobs.claim(jobId, "new")).toBeDefined();
		await expect(jobs.complete(jobId, "old", result)).rejects.toThrow(
			"lease lost",
		);
		await expect(jobs.fail(jobId, "old", "error")).rejects.toThrow(
			"lease lost",
		);
		await expect(jobs.release(jobId, "old", "error")).rejects.toThrow(
			"lease lost",
		);
		await jobs.complete(jobId, "new", result);
		expect((await jobs.load(jobId))?.status).toBe("completed");
	});
	it.each([
		"completed",
		"failed",
		"consumed",
	])("never claims or exhausts historical/terminal %s", async (status) => {
		const { jobs, insert } = setup();
		insert(status);
		expect(await jobs.claim(jobId, "owner")).toBeUndefined();
		await jobs.exhaust(jobId);
		expect((await jobs.load(jobId))?.status).toBe(status);
	});
	it("exhaustion cannot overwrite another live owner", async () => {
		const { jobs, insert } = setup();
		insert();
		await jobs.claim(jobId, "owner");
		await jobs.exhaust(jobId);
		expect((await jobs.load(jobId))?.status).toBe("processing");
	});
	it.each([
		null,
		"Earlier enqueue/provider/storage error",
	])("records exhaustion on an eligible job with prior error %j", async (error) => {
		const { jobs, insert, sqlite } = setup();
		insert();
		sqlite
			.prepare("UPDATE image_generation_jobs SET error = ? WHERE id = ?")
			.run(error, jobId);
		await jobs.exhaust(jobId);
		expect(await jobs.load(jobId)).toMatchObject({
			status: "failed",
			error: "Delivery retries exhausted; inspect DLQ before resubmitting.",
		});
	});
	it("does not claim missing records", async () => {
		expect(await setup().jobs.claim(jobId, "owner")).toBeUndefined();
	});
	it.each([
		"processing",
		"completed",
		"failed",
		"consumed",
	])("producer pending-only race guards preserve %s on successful and uncertain send", async (status) => {
		for (const sendThrows of [false, true]) {
			const { db, sqlite } = setup();
			await enqueueImageGeneration(
				db as unknown as Database,
				{
					send: async ({ jobId: id }) => {
						sqlite
							.prepare(
								"UPDATE image_generation_jobs SET status = ?, error = 'consumer outcome' WHERE id = ?",
							)
							.run(status, id);
						if (sendThrows) throw new Error("Uncertain delivery");
						return {
							metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } },
						};
					},
				},
				{ prompt: "portrait", model: GEMINI_IMAGE_MODEL },
			);
			expect(
				sqlite.prepare("SELECT status, error FROM image_generation_jobs").get(),
			).toMatchObject({ status, error: "consumer outcome" });
		}
	});
});
