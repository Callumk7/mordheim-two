const STYLE_INSTRUCTION = "Create the image in the style of John Blanche.";

export function prepareImagePrompt(prompt: string) {
	return `${prompt}\n\n${STYLE_INSTRUCTION}`;
}
