import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createGeminiGenerator,
	decodeJpeg,
	GENERATION_TIMEOUT_MS,
	IMAGE_MODEL,
	MAX_IMAGE_BYTES,
} from "./gemini";
import { jpegBase64, jpegBytes } from "./test-support";

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
		expect(await createGeminiGenerator("test-only-key")("portrait")).toEqual(
			jpegBytes,
		);
		expect(fetch).toHaveBeenCalledOnce();
		const calls: unknown[][] = fetch.mock.calls;
		const request = calls[0][0];
		expect(request).toBeInstanceOf(Request);
		if (!(request instanceof Request)) throw new Error("Expected SDK request");
		expect(request.url).toContain("/interactions");
		expect(await request.json()).toMatchObject({
			model: IMAGE_MODEL,
			input: "portrait\n\nCreate the image in the style of John Blanche.",
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
			createGeminiGenerator("test-only-key")("portrait"),
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
			createGeminiGenerator("test-only-key")("portrait"),
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
			createGeminiGenerator("test-only-key")("portrait"),
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
			createGeminiGenerator("test-only-key")("portrait"),
		).rejects.toMatchObject({ permanent: true });
		expect(fetch).toHaveBeenCalledOnce();
	});
});

describe("decodeJpeg", () => {
	it("accepts JPEG bytes", () =>
		expect(decodeJpeg(jpegBase64, "image/jpeg")).toEqual(jpegBytes));
	it.each([
		[undefined, "image/jpeg"],
		[jpegBase64, "image/png"],
		["%%%", "image/jpeg"],
		[btoa("not an image"), "image/jpeg"],
		[btoa(""), "image/jpeg"],
		[btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xff, 0xd9)), "image/jpeg"],
		[btoa(String.fromCharCode(...jpegBytes.slice(0, -2))), "image/jpeg"],
	])("rejects invalid MIME, encoding or signature: %j", (data, mimeType) => {
		expect(() => decodeJpeg(data, mimeType)).toThrow();
	});
	it("bounds encoded size before decoding", () => {
		expect(() =>
			decodeJpeg(
				"A".repeat(4 * Math.ceil(MAX_IMAGE_BYTES / 3) + 1),
				"image/jpeg",
			),
		).toThrow("oversized");
	});
});
