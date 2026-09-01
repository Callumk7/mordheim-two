import {
	createRouter as createTanStackRouter,
	Link,
} from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { getContext } from "./integrations/tanstack-query/root-provider";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const context = getContext();

	const router = createTanStackRouter({
		routeTree,
		context,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		defaultNotFoundComponent: DefaultNotFound,
	});

	setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

	return router;
}

function DefaultNotFound() {
	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
			<section className="rounded-xl border border-stone-800 bg-stone-900/40 px-6 py-14 text-center">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400">
					Not found
				</p>
				<h1 className="mt-3 font-serif text-3xl text-stone-100">
					Page not found
				</h1>
				<p className="mt-2 text-stone-500">
					The page you requested does not exist.
				</p>
				<Link
					className="mt-6 inline-flex text-amber-300 hover:text-amber-200"
					to="/"
				>
					Return home →
				</Link>
			</section>
		</main>
	);
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
