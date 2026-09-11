import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/db/index.server";
import { enqueueImageGeneration } from "@/db/operations/image-generation.server";
import {
	GEMINI_IMAGE_MODEL,
	ImageGenerationInputSchema,
	OPENAI_IMAGE_MODEL,
} from "@/db/validation/image-generation";

// These unit tests inject DB and queue doubles; no Workers runtime is needed.

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

const geminiJob = {
	prompt: "A portrait",
	model: GEMINI_IMAGE_MODEL,
} as const;

describe("image generation producer", () => {
	it("trims prompts, defaults the model, and validates explicit models", () => {
		expect(
			ImageGenerationInputSchema.parse({ prompt: "  A portrait  " }),
		).toEqual(geminiJob);
		expect(
			ImageGenerationInputSchema.parse({
				prompt: "A portrait",
				model: OPENAI_IMAGE_MODEL,
			}),
		).toMatchObject({ model: OPENAI_IMAGE_MODEL });
		for (const prompt of ["", "   ", "x".repeat(4001)]) {
			expect(ImageGenerationInputSchema.safeParse({ prompt }).success).toBe(
				false,
			);
		}
		expect(
			ImageGenerationInputSchema.safeParse({
				prompt: "A portrait",
				model: "unknown",
			}).success,
		).toBe(false);
	});

	it("persists the job before sending its ID and marks it queued", async () => {
		const { db, values, set, send } = setup();
		send.mockImplementation(async ({ jobId }) => {
			expect(values).toHaveBeenCalledWith({ id: jobId, ...geminiJob });
			expect(set).not.toHaveBeenCalled();
		});
		const result = await enqueueImageGeneration(db, { send }, geminiJob);
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
			enqueueImageGeneration(db, { send }, geminiJob),
		).rejects.toThrow("D1 unavailable");
		expect(send).not.toHaveBeenCalled();
	});

	it("records enqueue failure and returns the job ID", async () => {
		const { db, set, send } = setup();
		send.mockRejectedValue(new Error("Queue unavailable"));
		const result = await enqueueImageGeneration(db, { send }, geminiJob);
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
			enqueueImageGeneration(db, { send }, geminiJob),
		).rejects.toThrow("D1 unavailable");
		expect(send).toHaveBeenCalledOnce();
		expect(set).toHaveBeenCalledOnce();
		expect(set).toHaveBeenCalledWith(
			expect.objectContaining({ status: "queued" }),
		);
	});
});
