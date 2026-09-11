import type { ImageGenerationModel } from "@/db/validation/image-generation";

export interface ImageGenerator {
	readonly model: ImageGenerationModel;
	generate(prompt: string): Promise<Uint8Array>;
}

export type GetImageGenerator = (model: ImageGenerationModel) => ImageGenerator;
