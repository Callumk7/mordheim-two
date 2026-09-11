// Secrets are provisioned separately, never in wrangler vars or browser env.
interface ImageGenerationConsumerEnv {
	GEMINI_API_KEY?: string;
	OPENAI_API_KEY?: string;
}
