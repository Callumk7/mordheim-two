import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig(({ command }) => ({
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		cloudflare({
			viteEnvironment: { name: "ssr" },
			// One local runtime connects the app's queue to the separate consumer.
			// Production deployments remain independent of the app's Vite build.
			auxiliaryWorkers:
				command === "serve"
					? [{ configPath: "workers/image-generation/wrangler.jsonc" }]
					: [],
		}),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
}));

export default config;
