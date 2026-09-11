import { afterEach, describe, expect, it, vi } from "vitest";
import { OPENAI_IMAGE_MODEL } from "@/db/validation/image-generation";
import { GENERATION_TIMEOUT_MS } from "../generation/config";
import { jpegBase64, jpegBytes } from "../test-support";
import { createOpenAIImageGenerator } from "./openai";

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

function mockFetch(body: unknown, status = 200) {
	const fetch = vi.fn(
		async () =>
			new Response(JSON.stringify(body), {
				status,
				headers: { "Content-Type": "application/json" },
			}),
	);
	vi.stubGlobal("fetch", fetch);
	return fetch;
}

describe("OpenAI images adapter (real SDK, mocked network)", () => {
	it("requests one medium-quality square JPEG and decodes it", async () => {
		const fetch = mockFetch({ data: [{ b64_json: jpegBase64 }] });
		const timeout = vi.spyOn(AbortSignal, "timeout");
		expect(
			await createOpenAIImageGenerator("test-only-key").generate(
				"shared prompt",
			),
		).toEqual(jpegBytes);
		expect(fetch).toHaveBeenCalledOnce();
		const calls: unknown[][] = fetch.mock.calls;
		const request = calls[0][0];
		const init = calls[0][1];
		expect(String(request)).toContain("/images/generations");
		if (typeof init !== "object" || init === null || !("body" in init)) {
			throw new Error("Expected OpenAI SDK request options");
		}
		expect(JSON.parse(String(init.body))).toMatchObject({
			model: OPENAI_IMAGE_MODEL,
			prompt: "shared prompt",
			n: 1,
			quality: "medium",
			size: "1024x1024",
			output_format: "jpeg",
		});
		expect(timeout).toHaveBeenCalledWith(GENERATION_TIMEOUT_MS);
	});

	it.each([
		400, 401, 403, 408, 409, 429, 500, 503,
	])("sanitizes HTTP %s and disables SDK retries", async (status) => {
		const fetch = mockFetch(
			{ error: { message: "raw private provider response" } },
			status,
		);
		await expect(
			createOpenAIImageGenerator("test-only-key").generate("prompt"),
		).rejects.toMatchObject({
			message: `Image provider HTTP ${status}.`,
			permanent: status === 400,
		});
		expect(fetch).toHaveBeenCalledOnce();
	});

	it("sanitizes network failures without SDK retries", async () => {
		const fetch = vi
			.fn()
			.mockRejectedValue(new Error("private network detail"));
		vi.stubGlobal("fetch", fetch);
		await expect(
			createOpenAIImageGenerator("test-only-key").generate("prompt"),
		).rejects.toMatchObject({
			message: "Image provider request failed or timed out.",
			permanent: false,
		});
		expect(fetch).toHaveBeenCalledOnce();
	});

	it("permanently rejects responses without base64 image data", async () => {
		mockFetch({ data: [{ url: "https://untrusted.invalid/image" }] });
		await expect(
			createOpenAIImageGenerator("test-only-key").generate("prompt"),
		).rejects.toMatchObject({
			message: "Provider did not return a completed image.",
			permanent: true,
		});
	});
});
