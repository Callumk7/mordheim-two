import {
	createRouter as createTanStackRouter,
	Link,
} from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { Page } from "@/components/shared/page";
import { Typography } from "@/components/shared/typography";
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
		<Page padding="loose">
			<section className="rounded-xl border border-border bg-card px-6 py-14 text-center">
				<Typography variant="eyebrow">Not found</Typography>
				<Typography variant="pageTitle" className="mt-3 text-foreground">
					Page not found
				</Typography>
				<Typography variant="supportingBody" className="mt-2">
					The page you requested does not exist.
				</Typography>
				<Link
					className="mt-6 inline-flex text-primary hover:text-primary/80"
					to="/"
				>
					Return home →
				</Link>
			</section>
		</Page>
	);
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
