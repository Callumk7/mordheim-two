import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeImageGenerationBatch } from "./consumer";

const jobId = "d5da15a1-f26a-4f14-a350-3ba77d6ea6ad";
const job = {
	id: jobId,
	prompt: "A private portrait prompt",
	status: "pending" as const,
	error: null,
	createdAt: "2026-09-09",
	updatedAt: "2026-09-09",
};

function message(body: unknown): Message<unknown> {
	return {
		id: crypto.randomUUID(),
		timestamp: new Date(),
		body,
		attempts: 1,
		ack: vi.fn(),
		retry: vi.fn(),
	};
}

function batch(...messages: Message<unknown>[]): MessageBatch<unknown> {
	return {
		queue: "mordheim-image-generation",
		metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } },
		messages,
		ackAll: vi.fn(),
		retryAll: vi.fn(),
	};
}

afterEach(() => vi.restoreAllMocks());

describe("image generation consumer scaffold", () => {
	it("loads and acknowledges a job without logging its prompt", async () => {
		const log = vi.spyOn(console, "info").mockImplementation(() => {});
		const load = vi.fn().mockResolvedValue(job);
		const delivery = message({ jobId });
		await consumeImageGenerationBatch(batch(delivery), load);
		expect(load).toHaveBeenCalledExactlyOnceWith(jobId);
		expect(delivery.ack).toHaveBeenCalledOnce();
		expect(delivery.retry).not.toHaveBeenCalled();
		expect(log).toHaveBeenCalledExactlyOnceWith(
			"Image generation scaffold consumed job",
			{ jobId },
		);
	});

	it("retries invalid payloads without querying D1", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const load = vi.fn();
		const deliveries = [null, {}, { jobId: "bad" }, { jobId: 123 }].map(
			message,
		);
		await consumeImageGenerationBatch(batch(...deliveries), load);
		expect(load).not.toHaveBeenCalled();
		for (const delivery of deliveries) {
			expect(delivery.retry).toHaveBeenCalledOnce();
			expect(delivery.ack).not.toHaveBeenCalled();
		}
	});

	it.each([
		"missing",
		"database failure",
	])("retries a %s job but continues processing the batch", async (failure) => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(console, "info").mockImplementation(() => {});
		const load = vi.fn();
		if (failure === "missing") load.mockResolvedValueOnce(undefined);
		else load.mockRejectedValueOnce(new Error("D1 unavailable"));
		load.mockResolvedValueOnce(job);
		const failed = message({ jobId });
		const successful = message({ jobId });
		await consumeImageGenerationBatch(batch(failed, successful), load);
		expect(failed.retry).toHaveBeenCalledOnce();
		expect(failed.ack).not.toHaveBeenCalled();
		expect(successful.ack).toHaveBeenCalledOnce();
		expect(successful.retry).not.toHaveBeenCalled();
	});

	it("tolerates duplicate delivery without database writes or paid side effects", async () => {
		vi.spyOn(console, "info").mockImplementation(() => {});
		const load = vi.fn().mockResolvedValue(job);
		const deliveries = [message({ jobId }), message({ jobId })];
		await consumeImageGenerationBatch(batch(...deliveries), load);
		for (const delivery of deliveries) {
			expect(delivery.ack).toHaveBeenCalledOnce();
		}
	});
});
