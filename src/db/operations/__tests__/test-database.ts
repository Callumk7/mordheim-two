import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/d1";
import { getPlatformProxy } from "wrangler";
import * as schema from "@/db/schema";

// A fresh workerd D1 binding per test: no production config, remote bindings,
// persisted developer database, or test-owned implementation of transactions.
export async function createTestDatabase() {
	const platform = await getPlatformProxy<{ DB: D1Database }>({
		configPath: fileURLToPath(new URL("./wrangler.jsonc", import.meta.url)),
		envFiles: [],
		persist: false,
		remoteBindings: false,
	});
	try {
		const directory = new URL("../../../../drizzle/", import.meta.url);
		const migrations = (await readdir(directory))
			.filter((name) => name.endsWith(".sql"))
			.sort();
		for (const name of migrations) {
			const sql = await readFile(new URL(name, directory), "utf8");
			const statements = sql
				.split("--> statement-breakpoint")
				.map((statement) => statement.trim())
				.filter(Boolean);
			await platform.env.DB.batch(
				statements.map((statement) => platform.env.DB.prepare(statement)),
			);
		}
		return {
			db: drizzle(platform.env.DB, { schema }),
			binding: platform.env.DB,
			dispose: platform.dispose,
		};
	} catch (error) {
		await platform.dispose();
		throw error;
	}
}
