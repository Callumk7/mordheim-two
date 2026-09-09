import { GoogleGenAI, type Interactions } from "@google/genai";

export const IMAGE_MODEL = "gemini-3.1-flash-image";
export const GENERATION_TIMEOUT_MS = 120_000;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Only these sanitized messages reach D1. Never persist provider error bodies.
export class GenerationError extends Error {
	constructor(
		message: string,
		readonly permanent = false,
	) {
		super(message);
	}
}

export function decodeJpeg(
	data: string | undefined,
	mimeType: string | undefined,
) {
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

export function createGeminiGenerator(apiKey: string) {
	const client = new GoogleGenAI({ apiKey });
	return async (prompt: string) => {
		try {
			const interaction = await client.interactions.create(
				{
					model: IMAGE_MODEL,
					input: prompt,
					stream: false,
					store: false,
					response_format: {
						type: "image",
						mime_type: "image/jpeg",
						aspect_ratio: "1:1",
						image_size: "1K",
					} satisfies Interactions.ImageResponseFormat,
				},
				{
					// Interactions has its own retry policy (SDK default is four retries).
					// Only Queues retries; abort also bounds response-body consumption.
					maxRetries: 0,
					timeout: GENERATION_TIMEOUT_MS,
					signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
				},
			);
			if (interaction.status !== "completed" || !interaction.output_image) {
				throw new GenerationError(
					"Provider did not return a completed image.",
					true,
				);
			}
			return decodeJpeg(
				interaction.output_image.data,
				interaction.output_image.mime_type,
			);
		} catch (error) {
			if (error instanceof GenerationError) throw error;
			// Interactions 2.21 uses an internal APIError, not exported ApiError.
			if (
				typeof error === "object" &&
				error !== null &&
				"status" in error &&
				typeof error.status === "number" &&
				Number.isInteger(error.status) &&
				error.status >= 400 &&
				error.status <= 599
			) {
				const status = error.status;
				const permanent =
					status >= 400 &&
					status < 500 &&
					![401, 403, 408, 409, 429].includes(status);
				throw new GenerationError(`Image provider HTTP ${status}.`, permanent);
			}
			throw new GenerationError("Image provider request failed or timed out.");
		}
	};
}
