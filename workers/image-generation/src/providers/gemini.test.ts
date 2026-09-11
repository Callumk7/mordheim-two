import { afterEach, describe, expect, it, vi } from "vitest";
import { GEMINI_IMAGE_MODEL } from "@/db/validation/image-generation";
import { GENERATION_TIMEOUT_MS } from "../generation/config";
import { jpegBase64, jpegBytes } from "../test-support";
import { createGeminiGenerator } from "./gemini";

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

describe("Gemini interactions adapter (real SDK, mocked network)", () => {
	it("uses the requested model and image response format, extracting final output_image", async () => {
		const fetch = mockFetch({
			id: "interaction",
			status: "completed",
			output_image: {
				type: "image",
				mime_type: "image/jpeg",
				data: jpegBase64,
			},
		});
		const timeout = vi.spyOn(AbortSignal, "timeout");
		expect(
			await createGeminiGenerator("test-only-key").generate("shared prompt"),
		).toEqual(jpegBytes);
		expect(fetch).toHaveBeenCalledOnce();
		const calls: unknown[][] = fetch.mock.calls;
		const request = calls[0][0];
		expect(request).toBeInstanceOf(Request);
		if (!(request instanceof Request)) throw new Error("Expected SDK request");
		expect(request.url).toContain("/interactions");
		expect(await request.json()).toMatchObject({
			model: GEMINI_IMAGE_MODEL,
			input: "shared prompt",
			stream: false,
			store: false,
			response_format: {
				type: "image",
				mime_type: "image/jpeg",
				aspect_ratio: "1:1",
				image_size: "1K",
			},
		});
		expect(timeout).toHaveBeenCalledWith(GENERATION_TIMEOUT_MS);
	});
	it.each([
		400, 401, 403, 408, 409, 429, 500, 503,
	])("sanitizes HTTP %s and disables SDK retries", async (status) => {
		const fetch = mockFetch(
			{
				error: {
					message: "raw private provider response",
					code: status,
					status: "UNKNOWN",
				},
			},
			status,
		);
		await expect(
			createGeminiGenerator("test-only-key").generate("portrait"),
		).rejects.toMatchObject({
			message: `Image provider HTTP ${status}.`,
			permanent: status === 400,
		});
		expect(fetch).toHaveBeenCalledOnce();
	});
	it("sanitizes network/timeout failures without SDK retries", async () => {
		const fetch = vi
			.fn()
			.mockRejectedValue(new DOMException("private details", "TimeoutError"));
		vi.stubGlobal("fetch", fetch);
		await expect(
			createGeminiGenerator("test-only-key").generate("portrait"),
		).rejects.toMatchObject({
			message: "Image provider request failed or timed out.",
			permanent: false,
		});
		expect(fetch).toHaveBeenCalledOnce();
	});
	it.each([
		"completed",
		"failed",
		"incomplete",
	])("permanently fails a %s response with no final image", async (status) => {
		mockFetch({ id: "interaction", status, output_text: "no image" });
		await expect(
			createGeminiGenerator("test-only-key").generate("portrait"),
		).rejects.toMatchObject({
			permanent: true,
			message: "Provider did not return a completed image.",
		});
	});
	it("does not follow provider image URIs", async () => {
		const fetch = mockFetch({
			id: "interaction",
			status: "completed",
			output_image: {
				type: "image",
				mime_type: "image/jpeg",
				uri: "https://untrusted.invalid/image",
			},
		});
		await expect(
			createGeminiGenerator("test-only-key").generate("portrait"),
		).rejects.toMatchObject({ permanent: true });
		expect(fetch).toHaveBeenCalledOnce();
	});
});
