import { MAX_IMAGE_BYTES } from "./config";
import { GenerationError } from "./errors";

export function decodeJpeg(data: string | undefined, mimeType = "image/jpeg") {
	if (
		mimeType !== "image/jpeg" ||
		!data ||
		data.length > 4 * Math.ceil(MAX_IMAGE_BYTES / 3)
	) {
		throw new GenerationError(
			"Provider returned an invalid or oversized JPEG.",
			true,
		);
	}
	let binary: string;
	try {
		binary = atob(data);
	} catch {
		throw new GenerationError(
			"Provider returned invalid image encoding.",
			true,
		);
	}
	const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
	const signature = [0xff, 0xd8, 0xff];
	if (
		bytes.length <= signature.length + 2 ||
		bytes.length > MAX_IMAGE_BYTES ||
		!signature.every((byte, index) => bytes[index] === byte) ||
		bytes[bytes.length - 2] !== 0xff ||
		bytes[bytes.length - 1] !== 0xd9
	) {
		throw new GenerationError(
			"Provider returned an invalid or oversized JPEG.",
			true,
		);
	}
	return bytes;
}
