import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			// Server modules import this Workers-only module at the top level. The
			// stub keeps them importable; reaching a binding still throws.
			"cloudflare:workers": fileURLToPath(
				new URL("./src/test-support/cloudflare-workers-stub.ts", import.meta.url),
			),
		},
	},
});
