import { describe, expect, it } from "vitest";
import { jpegBase64, jpegBytes } from "../test-support";
import { MAX_IMAGE_BYTES } from "./config";
import { decodeJpeg } from "./jpeg";

describe("decodeJpeg", () => {
	it("accepts JPEG bytes", () =>
		expect(decodeJpeg(jpegBase64, "image/jpeg")).toEqual(jpegBytes));
	// Adapters that always request JPEG, such as OpenAI, omit the MIME type.
	it("defaults to JPEG when a provider reports no MIME type", () =>
		expect(decodeJpeg(jpegBase64)).toEqual(jpegBytes));
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
