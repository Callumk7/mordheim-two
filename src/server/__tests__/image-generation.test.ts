import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/db/index.server";
import { ImageGenerationInputSchema } from "@/db/validation/image-generation";
import { enqueueImageGeneration } from "../image-generation";

function setup() {
	const values = vi.fn().mockResolvedValue(undefined);
	const where = vi.fn().mockResolvedValue(undefined);
	const set = vi.fn().mockReturnValue({ where });
	const db = {
		insert: vi.fn().mockReturnValue({ values }),
		update: vi.fn().mockReturnValue({ set }),
	} as unknown as Database;
	const send = vi.fn().mockResolvedValue(undefined);
	return { db, values, where, set, send };
}

describe("image generation producer", () => {
	it("trims prompts and rejects empty or oversized input", () => {
		expect(
			ImageGenerationInputSchema.parse({ prompt: "  A portrait  " }),
		).toEqual({
			prompt: "A portrait",
		});
		for (const prompt of ["", "   ", "x".repeat(4001)]) {
			expect(ImageGenerationInputSchema.safeParse({ prompt }).success).toBe(
				false,
			);
		}
	});

	it("persists the job before sending its ID and marks it queued", async () => {
		const { db, values, set, send } = setup();
		send.mockImplementation(async ({ jobId }) => {
			expect(values).toHaveBeenCalledWith({ id: jobId, prompt: "A portrait" });
			expect(set).not.toHaveBeenCalled();
		});
		const result = await enqueueImageGeneration(db, { send }, "A portrait");
		expect(result).toEqual({ jobId: expect.any(String), status: "queued" });
		expect(send).toHaveBeenCalledExactlyOnceWith({ jobId: result.jobId });
		expect(set).toHaveBeenCalledWith(
			expect.objectContaining({ status: "queued" }),
		);
	});

	it("does not send if the initial D1 insert fails", async () => {
		const { db, values, send } = setup();
		values.mockRejectedValue(new Error("D1 unavailable"));
		await expect(
			enqueueImageGeneration(db, { send }, "A portrait"),
		).rejects.toThrow("D1 unavailable");
		expect(send).not.toHaveBeenCalled();
	});

	it("records enqueue failure and returns the job ID", async () => {
		const { db, set, send } = setup();
		send.mockRejectedValue(new Error("Queue unavailable"));
		const result = await enqueueImageGeneration(db, { send }, "A portrait");
		expect(result.status).toBe("enqueue_failed");
		expect(result.jobId).toEqual(expect.any(String));
		expect(set).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "enqueue_failed",
				error: expect.any(String),
			}),
		);
	});

	it("does not mislabel a post-send D1 failure as an enqueue failure", async () => {
		const { db, where, set, send } = setup();
		where.mockRejectedValue(new Error("D1 unavailable"));
		await expect(
			enqueueImageGeneration(db, { send }, "A portrait"),
		).rejects.toThrow("D1 unavailable");
		expect(send).toHaveBeenCalledOnce();
		expect(set).toHaveBeenCalledOnce();
		expect(set).toHaveBeenCalledWith(
			expect.objectContaining({ status: "queued" }),
		);
	});
});
