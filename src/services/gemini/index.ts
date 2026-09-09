import { GoogleGenAI } from "@google/genai";
import { createServerFn } from "@tanstack/react-start";

export const generateServerFunction = createServerFn({ method: "GET" }).handler(
	async () => {
		const ai = new GoogleGenAI({
			apiKey: process.env.GEMINI_API_KEY,
		});

		const interaction = await ai.interactions.create({
			model: "gemini-3.8-flash",
			input: "Explain how AI works in a few words",
		});

		return {
			id: interaction.id,
			text: interaction.output_text ?? "",
		};
	},
);
