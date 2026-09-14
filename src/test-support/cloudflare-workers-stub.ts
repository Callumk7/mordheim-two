/**
 * Stands in for the `cloudflare:workers` module under Vitest so that server
 * modules are importable outside the Workers runtime. Tests that exercise a
 * server function mock the module using `env`; this only keeps the import graph
 * loadable, and fails loudly if a binding is actually reached.
 */
export const env = new Proxy(
	{},
	{
		get(_target, property) {
			throw new Error(
				`Cloudflare binding "${String(property)}" is not available in tests. Mock the server module that uses it.`,
			);
		},
	},
) as Record<string, never>;
