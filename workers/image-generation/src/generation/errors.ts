// Only these sanitized messages reach D1. Never persist provider error bodies.
export class GenerationError extends Error {
	constructor(
		message: string,
		readonly permanent = false,
	) {
		super(message);
	}
}

export function sanitizeProviderError(
	error: unknown,
	stage = "Image provider",
) {
	if (error instanceof GenerationError) return error;
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
		return new GenerationError(`${stage} HTTP ${status}.`, permanent);
	}
	return new GenerationError(`${stage} request failed or timed out.`);
}

export function sanitizeRefinementError(error: unknown) {
	const sanitized = sanitizeProviderError(error, "Prompt refinement");
	return new GenerationError(sanitized.message, true);
}
