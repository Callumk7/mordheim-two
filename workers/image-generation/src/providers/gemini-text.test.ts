import { afterEach, describe, expect, it, vi } from "vitest";
import { GEMINI_TEXT_MODEL, REFINEMENT_TIMEOUT_MS } from "../generation/config";
import { IMAGE_PROMPT_REFINEMENT_INSTRUCTIONS } from "../generation/prompt";
import { createGeminiPromptRefiner } from "./gemini-text";

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

function refine(
	prompt: string,
	instructions = IMAGE_PROMPT_REFINEMENT_INSTRUCTIONS,
	apiKey: string | undefined = "test-only-key",
) {
	return createGeminiPromptRefiner(apiKey)(prompt, instructions);
}

function textResponse(text: string) {
	return {
		candidates: [
			{
				content: {
					role: "model",
					parts: [{ text }],
				},
				finishReason: "STOP",
			},
		],
	};
}

describe("Gemini text prompt refiner (real SDK, mocked network)", () => {
	it("sends the snapshot with refinement instructions and returns trimmed text", async () => {
		const fetch = mockFetch(textResponse("  refined portrait  "));
		const timeout = vi.spyOn(AbortSignal, "timeout");
		expect(await refine("labeled snapshot")).toBe("refined portrait");
		expect(fetch).toHaveBeenCalledOnce();
		const calls: unknown[][] = fetch.mock.calls;
		const [url, init] = calls[0] ?? [];
		expect(String(url)).toContain(GEMINI_TEXT_MODEL);
		expect(String(url)).toContain("generateContent");
		expect(
			JSON.parse(String((init as { body?: unknown } | undefined)?.body)),
		).toMatchObject({
			systemInstruction: {
				parts: [{ text: IMAGE_PROMPT_REFINEMENT_INSTRUCTIONS }],
			},
			contents: [{ parts: [{ text: "labeled snapshot" }] }],
		});
		expect(timeout).toHaveBeenCalledWith(REFINEMENT_TIMEOUT_MS);
	});
	it("uses configured refinement instructions instead of the default brief", async () => {
		const fetch = mockFetch(textResponse("custom refined"));
		expect(await refine("labeled snapshot", "Paint like a woodcut.")).toBe(
			"custom refined",
		);
		const calls: unknown[][] = fetch.mock.calls;
		const [, init] = calls[0] ?? [];
		expect(
			JSON.parse(String((init as { body?: unknown } | undefined)?.body)),
		).toMatchObject({
			systemInstruction: { parts: [{ text: "Paint like a woodcut." }] },
		});
	});
	it("permanently fails empty refiner output", async () => {
		mockFetch(textResponse("   "));
		await expect(refine("labeled snapshot")).rejects.toMatchObject({
			message: "Prompt refiner did not return a prompt.",
			permanent: true,
		});
	});
	it.each([
		400, 401, 403, 408, 409, 429, 500, 503,
	])("sanitizes HTTP %s as a permanent refinement failure", async (status) => {
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
		await expect(refine("portrait")).rejects.toMatchObject({
			message: `Prompt refinement HTTP ${status}.`,
			permanent: true,
		});
		expect(fetch).toHaveBeenCalledOnce();
	});
	it("sanitizes network/timeout failures without leaking details", async () => {
		const fetch = vi
			.fn()
			.mockRejectedValue(new DOMException("private details", "TimeoutError"));
		vi.stubGlobal("fetch", fetch);
		await expect(refine("portrait")).rejects.toMatchObject({
			message: "Prompt refinement request failed or timed out.",
			permanent: true,
		});
		expect(fetch).toHaveBeenCalledOnce();
	});
	it("permanently fails when GEMINI_API_KEY is missing", async () => {
		await expect(
			createGeminiPromptRefiner(undefined)(
				"portrait",
				IMAGE_PROMPT_REFINEMENT_INSTRUCTIONS,
			),
		).rejects.toMatchObject({
			message: "Consumer GEMINI_API_KEY is not configured.",
			permanent: true,
		});
	});
});
