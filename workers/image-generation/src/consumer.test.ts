import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeImageGenerationBatch, imageKey } from "./consumer";
import { GenerationError, IMAGE_MODEL } from "./gemini";
import { LEASE_MS, MAX_DELIVERY_ATTEMPTS } from "./jobs";
import { jobId, jpegBytes, setupDatabase } from "./test-support";

function message(body: unknown = { jobId }, attempts = 1): Message<unknown> {
	return {
		id: crypto.randomUUID(),
		timestamp: new Date(),
		body,
		attempts,
		ack: vi.fn(),
		retry: vi.fn(),
	};
}
function batch(...messages: Message<unknown>[]): MessageBatch<unknown> {
	return {
		queue: "test",
		metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } },
		messages,
		ackAll: vi.fn(),
		retryAll: vi.fn(),
	};
}
const connections: ReturnType<typeof setupDatabase>[] = [];
function setup(status = "queued") {
	const connection = setupDatabase();
	connections.push(connection);
	connection.insert(status);
	let stored: R2Object | null = null;
	const bucket = {
		head: vi.fn(async () => stored),
		put: vi.fn(
			async (
				key: string,
				_bytes: unknown,
				options?: R2PutOptions,
			): Promise<R2Object> => {
				stored = {
					key,
					version: "v1",
					size: jpegBytes.length,
					etag: "etag",
					httpEtag: '"etag"',
					checksums: { toJSON: () => ({}) },
					uploaded: new Date(),
					storageClass: "Standard",
					httpMetadata:
						options?.httpMetadata instanceof Headers
							? {}
							: options?.httpMetadata,
					customMetadata: options?.customMetadata,
					writeHttpMetadata: () => {},
				};
				return stored;
			},
		),
	};
	const dependencies = {
		jobs: connection.jobs,
		bucket,
		enabled: true,
		generate: vi.fn(async () => jpegBytes),
	};
	return { ...connection, dependencies, bucket, getStored: () => stored };
}
beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => {
	vi.restoreAllMocks();
	for (const { sqlite } of connections.splice(0)) sqlite.close();
});

describe("image generation consumer", () => {
	it("loads the private prompt, stores JPEG and completes D1 before ack", async () => {
		const { jobs, dependencies, bucket } = setup();
		const delivery = message();
		const complete = vi.spyOn(jobs, "complete");
		await consumeImageGenerationBatch(batch(delivery), dependencies);
		expect(dependencies.generate).toHaveBeenCalledExactlyOnceWith(
			"private portrait prompt",
		);
		expect(bucket.put).toHaveBeenCalledExactlyOnceWith(
			`image-generation/${jobId}.jpg`,
			jpegBytes,
			{
				httpMetadata: { contentType: "image/jpeg" },
				customMetadata: { jobId, model: IMAGE_MODEL },
				onlyIf: { etagDoesNotMatch: "*" },
			},
		);
		expect(await jobs.load(jobId)).toMatchObject({
			status: "completed",
			resultKey: imageKey(jobId),
			resultBytes: jpegBytes.length,
			resultMimeType: "image/jpeg",
			resultModel: IMAGE_MODEL,
			resultEtag: "etag",
			completedAt: expect.any(String),
			error: null,
			leaseToken: null,
		});
		expect(bucket.put.mock.invocationCallOrder[0]).toBeLessThan(
			complete.mock.invocationCallOrder[0],
		);
		expect(complete.mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(delivery.ack).mock.invocationCallOrder[0],
		);
		expect(delivery.retry).not.toHaveBeenCalled();
		expect(console.error).not.toHaveBeenCalled();
	});
	it("does not ack while the D1 completion promise is outstanding", async () => {
		const { jobs, dependencies } = setup();
		const delivery = message();
		const original = jobs.complete;
		let unblock = () => {};
		const barrier = new Promise<void>((resolve) => {
			unblock = resolve;
		});
		let entered = () => {};
		const started = new Promise<void>((resolve) => {
			entered = resolve;
		});
		vi.spyOn(jobs, "complete").mockImplementation(async (...args) => {
			entered();
			await barrier;
			await original(...args);
		});
		const processing = consumeImageGenerationBatch(
			batch(delivery),
			dependencies,
		);
		await started;
		expect(delivery.ack).not.toHaveBeenCalled();
		unblock();
		await processing;
		expect(delivery.ack).toHaveBeenCalledOnce();
	});
	it("dedupes completed delivery without another provider or R2 call", async () => {
		const { dependencies, bucket } = setup();
		await consumeImageGenerationBatch(
			batch(message(), message()),
			dependencies,
		);
		expect(dependencies.generate).toHaveBeenCalledOnce();
		expect(bucket.head).toHaveBeenCalledOnce();
	});
	it("concurrent delivery retries without generating or acknowledging the other owner's work", async () => {
		const { dependencies } = setup();
		let unblock = () => {};
		const barrier = new Promise<void>((resolve) => {
			unblock = resolve;
		});
		let entered = () => {};
		const started = new Promise<void>((resolve) => {
			entered = resolve;
		});
		dependencies.generate.mockImplementation(async () => {
			entered();
			await barrier;
			return jpegBytes;
		});
		const first = consumeImageGenerationBatch(batch(message()), dependencies);
		await started;
		const duplicate = message();
		await consumeImageGenerationBatch(batch(duplicate), dependencies);
		expect(duplicate.ack).not.toHaveBeenCalled();
		expect(duplicate.retry).toHaveBeenCalledWith({
			delaySeconds: LEASE_MS / 1000,
		});
		expect(dependencies.generate).toHaveBeenCalledOnce();
		unblock();
		await first;
	});
	it.each([
		"consumed",
		"failed",
		"completed",
	])("preserves %s without implicit replay", async (status) => {
		const { dependencies, jobs, bucket } = setup(status);
		const delivery = message();
		await consumeImageGenerationBatch(batch(delivery), dependencies);
		expect(delivery.ack).toHaveBeenCalledOnce();
		expect((await jobs.load(jobId))?.status).toBe(status);
		expect(dependencies.generate).not.toHaveBeenCalled();
		expect(bucket.head).not.toHaveBeenCalled();
	});
	it("disabled generation durably fails and acks without paid calls; enable does not replay it", async () => {
		const { dependencies, jobs } = setup();
		dependencies.enabled = false;
		const delivery = message();
		await consumeImageGenerationBatch(batch(delivery), dependencies);
		expect(await jobs.load(jobId)).toMatchObject({
			status: "failed",
			error: expect.stringContaining("disabled"),
		});
		expect(delivery.ack).toHaveBeenCalledOnce();
		dependencies.enabled = true;
		await consumeImageGenerationBatch(batch(message()), dependencies);
		expect(dependencies.generate).not.toHaveBeenCalled();
	});
	it.each([
		"provider",
		"R2 head",
		"R2 put",
		"D1 claim",
		"D1 complete",
	])("retries %s failure and recovers without acking failure", async (failure) => {
		const { dependencies, jobs, bucket } = setup();
		const error = new Error("sensitive raw failure");
		if (failure === "provider")
			dependencies.generate.mockRejectedValueOnce(error);
		if (failure === "R2 head") bucket.head.mockRejectedValueOnce(error);
		if (failure === "R2 put") bucket.put.mockRejectedValueOnce(error);
		if (failure === "D1 claim")
			vi.spyOn(jobs, "claim").mockRejectedValueOnce(error);
		if (failure === "D1 complete")
			vi.spyOn(jobs, "complete").mockRejectedValueOnce(error);
		const delivery = message();
		await consumeImageGenerationBatch(batch(delivery), dependencies);
		expect(delivery.ack).not.toHaveBeenCalled();
		expect(delivery.retry).toHaveBeenCalledOnce();
		expect((await jobs.load(jobId))?.error ?? "").not.toContain("sensitive");
		const retry = message({ jobId }, 2);
		await consumeImageGenerationBatch(batch(retry), dependencies);
		expect(retry.ack).toHaveBeenCalledOnce();
		expect((await jobs.load(jobId))?.status).toBe("completed");
		if (failure === "D1 complete")
			expect(dependencies.generate).toHaveBeenCalledOnce();
		expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(
			/private|sensitive/,
		);
	});
	it("recovers an uncertain R2 put from the deterministic object without regeneration", async () => {
		const { dependencies, bucket } = setup();
		const original = bucket.put.getMockImplementation();
		bucket.put.mockImplementationOnce(async (...args) => {
			await original?.(...args);
			throw new Error("response lost");
		});
		await consumeImageGenerationBatch(batch(message()), dependencies);
		await consumeImageGenerationBatch(
			batch(message({ jobId }, 2)),
			dependencies,
		);
		expect(dependencies.generate).toHaveBeenCalledOnce();
		expect(bucket.put).toHaveBeenCalledOnce();
	});
	it("recovers persisted R2 after a crash/expired lease even while disabled", async () => {
		const { dependencies, jobs, bucket, sqlite } = setup();
		await jobs.claim(jobId, "crashed");
		await bucket.put(imageKey(jobId), jpegBytes, {
			httpMetadata: { contentType: "image/jpeg" },
			customMetadata: { jobId, model: IMAGE_MODEL },
		});
		sqlite.exec("UPDATE image_generation_jobs SET lease_expires_at = 0");
		dependencies.enabled = false;
		await consumeImageGenerationBatch(batch(message()), dependencies);
		expect((await jobs.load(jobId))?.status).toBe("completed");
		expect(dependencies.generate).not.toHaveBeenCalled();
	});
	it("permanent provider/no-image failure is persisted before ack", async () => {
		const { dependencies, jobs } = setup();
		dependencies.generate.mockRejectedValue(
			new GenerationError("Provider did not return a completed image.", true),
		);
		const delivery = message();
		await consumeImageGenerationBatch(batch(delivery), dependencies);
		expect(await jobs.load(jobId)).toMatchObject({
			status: "failed",
			error: "Provider did not return a completed image.",
		});
		expect(delivery.ack).toHaveBeenCalledOnce();
	});
	it("D1 failure writing a permanent failure still retries", async () => {
		const { dependencies, jobs } = setup();
		dependencies.generate.mockRejectedValue(
			new GenerationError("No image.", true),
		);
		vi.spyOn(jobs, "fail").mockRejectedValue(new Error("D1 unavailable"));
		const delivery = message();
		await consumeImageGenerationBatch(batch(delivery), dependencies);
		expect(delivery.ack).not.toHaveBeenCalled();
		expect(delivery.retry).toHaveBeenCalledOnce();
	});
	it("persists final retry exhaustion but retries for DLQ rather than ack", async () => {
		const { dependencies, jobs } = setup();
		dependencies.generate.mockRejectedValue(
			new GenerationError("Image provider HTTP 429."),
		);
		const delivery = message({ jobId }, MAX_DELIVERY_ATTEMPTS);
		await consumeImageGenerationBatch(batch(delivery), dependencies);
		expect(await jobs.load(jobId)).toMatchObject({
			status: "failed",
			error: expect.stringContaining("exhausted"),
		});
		expect(delivery.ack).not.toHaveBeenCalled();
		expect(delivery.retry).toHaveBeenCalledOnce();
	});
	it.each([
		"R2",
		"D1 result",
	])("final %s failure records failure but does not ack", async (failure) => {
		const { dependencies, jobs, bucket } = setup();
		if (failure === "R2")
			bucket.head.mockRejectedValue(new Error("unavailable"));
		else vi.spyOn(jobs, "complete").mockRejectedValue(new Error("unavailable"));
		const delivery = message({ jobId }, MAX_DELIVERY_ATTEMPTS);
		await consumeImageGenerationBatch(batch(delivery), dependencies);
		expect(await jobs.load(jobId)).toMatchObject({
			status: "failed",
			error: expect.stringContaining("exhausted"),
		});
		expect(delivery.ack).not.toHaveBeenCalled();
		expect(delivery.retry).toHaveBeenCalledOnce();
	});
	it("final claim failure replaces a prior error with exhaustion before DLQ retry", async () => {
		const { dependencies, jobs, sqlite } = setup();
		sqlite.exec(
			"UPDATE image_generation_jobs SET error = 'Earlier storage failure'",
		);
		vi.spyOn(jobs, "claim").mockRejectedValueOnce(new Error("D1 unavailable"));
		const delivery = message({ jobId }, MAX_DELIVERY_ATTEMPTS);
		await consumeImageGenerationBatch(batch(delivery), dependencies);
		expect(await jobs.load(jobId)).toMatchObject({
			status: "failed",
			error: "Delivery retries exhausted; inspect DLQ before resubmitting.",
		});
		expect(delivery.ack).not.toHaveBeenCalled();
		expect(delivery.retry).toHaveBeenCalledOnce();
		expect(dependencies.generate).not.toHaveBeenCalled();
	});
	it("retries even when D1 cannot record final exhaustion", async () => {
		const { dependencies, jobs } = setup();
		vi.spyOn(jobs, "claim").mockRejectedValue(new Error("D1 unavailable"));
		vi.spyOn(jobs, "exhaust").mockImplementation(() => {
			throw new Error("D1 unavailable");
		});
		const delivery = message({ jobId }, MAX_DELIVERY_ATTEMPTS);
		await consumeImageGenerationBatch(batch(delivery), dependencies);
		expect(delivery.ack).not.toHaveBeenCalled();
		expect(delivery.retry).toHaveBeenCalledOnce();
	});
	it("an uncertain D1 completion retries then dedupes its committed result", async () => {
		const { dependencies, jobs } = setup();
		const complete = jobs.complete;
		vi.spyOn(jobs, "complete").mockImplementationOnce(async (...args) => {
			await complete(...args);
			throw new Error("response lost");
		});
		const delivery = message();
		await consumeImageGenerationBatch(batch(delivery), dependencies);
		expect(delivery.ack).not.toHaveBeenCalled();
		expect(delivery.retry).toHaveBeenCalledOnce();
		const retry = message({ jobId }, 2);
		await consumeImageGenerationBatch(batch(retry), dependencies);
		expect(retry.ack).toHaveBeenCalledOnce();
		expect(dependencies.generate).toHaveBeenCalledOnce();
	});
	it("a lost claim response waits a full lease rather than burning short retries", async () => {
		const { dependencies, jobs } = setup();
		const claim = jobs.claim;
		vi.spyOn(jobs, "claim").mockImplementationOnce(async (...args) => {
			await claim(...args);
			throw new Error("response lost");
		});
		await consumeImageGenerationBatch(batch(message()), dependencies);
		const retry = message({ jobId }, 2);
		await consumeImageGenerationBatch(batch(retry), dependencies);
		expect(retry.retry).toHaveBeenCalledExactlyOnceWith({
			delaySeconds: LEASE_MS / 1000,
		});
		expect(retry.ack).not.toHaveBeenCalled();
		expect(dependencies.generate).not.toHaveBeenCalled();
	});
	it.each([
		"mime",
		"size",
		"jobId",
		"model",
	])("refuses invalid stored %s without overwriting or regenerating", async (field) => {
		const { dependencies, bucket, jobs } = setup();
		const object = await bucket.put(imageKey(jobId), jpegBytes, {
			httpMetadata: { contentType: "image/jpeg" },
			customMetadata: { jobId, model: IMAGE_MODEL },
		});
		bucket.head.mockResolvedValue({
			...object,
			writeHttpMetadata: () => {},
			...(field === "mime"
				? { httpMetadata: { contentType: "text/plain" } }
				: {}),
			...(field === "size" ? { size: 0 } : {}),
			...(field === "jobId"
				? { customMetadata: { jobId: "other", model: IMAGE_MODEL } }
				: {}),
			...(field === "model"
				? { customMetadata: { jobId, model: "other" } }
				: {}),
		});
		bucket.put.mockClear();
		const delivery = message();
		await consumeImageGenerationBatch(batch(delivery), dependencies);
		expect(await jobs.load(jobId)).toMatchObject({
			status: "failed",
			error: expect.stringContaining("metadata is invalid"),
		});
		expect(delivery.ack).toHaveBeenCalledOnce();
		expect(bucket.put).not.toHaveBeenCalled();
		expect(dependencies.generate).not.toHaveBeenCalled();
	});
	it.each([
		null,
		{},
		{ jobId: "invalid" },
		{ jobId: 123 },
		{ jobId: "d5da15a1-f26a-4f14-a350-3ba77d6ea600" },
	])("retries invalid/missing jobs to DLQ while allowing valid siblings: %j", async (body) => {
		const { dependencies } = setup();
		const invalid = message(body, MAX_DELIVERY_ATTEMPTS);
		const valid = message();
		await consumeImageGenerationBatch(batch(invalid, valid), dependencies);
		expect(invalid.ack).not.toHaveBeenCalled();
		expect(invalid.retry).toHaveBeenCalledOnce();
		expect(valid.ack).toHaveBeenCalledOnce();
	});
});
