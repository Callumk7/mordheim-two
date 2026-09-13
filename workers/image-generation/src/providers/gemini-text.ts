import { GoogleGenAI } from "@google/genai";
import { GEMINI_TEXT_MODEL, REFINEMENT_TIMEOUT_MS } from "../generation/config";
import { GenerationError, sanitizeRefinementError } from "../generation/errors";
import { IMAGE_PROMPT_REFINEMENT_INSTRUCTIONS } from "../generation/prompt";
import type { PromptRefiner } from "../generation/types";

export function createGeminiPromptRefiner(
	apiKey: string | undefined,
): PromptRefiner {
	if (!apiKey) {
		return async () => {
			throw new GenerationError(
				"Consumer GEMINI_API_KEY is not configured.",
				true,
			);
		};
	}
	const client = new GoogleGenAI({ apiKey });
	return async (prompt) => {
		try {
			const response = await client.models.generateContent({
				model: GEMINI_TEXT_MODEL,
				contents: prompt,
				config: {
					systemInstruction: IMAGE_PROMPT_REFINEMENT_INSTRUCTIONS,
					abortSignal: AbortSignal.timeout(REFINEMENT_TIMEOUT_MS),
					httpOptions: {
						timeout: REFINEMENT_TIMEOUT_MS,
						retryOptions: { attempts: 1 },
					},
				},
			});
			const refined = response.text?.trim();
			if (!refined) {
				throw new GenerationError(
					"Prompt refiner did not return a prompt.",
					true,
				);
			}
			return refined;
		} catch (error) {
			throw sanitizeRefinementError(error);
		}
	};
}
