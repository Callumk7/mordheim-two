import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { NotFoundPanel } from "@/components/shared/entity-chrome";
import { Page } from "@/components/shared/page";
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
			<NotFoundPanel
				description="The page you requested does not exist."
				link={{ to: "/" }}
				linkLabel="Return home →"
				title="Page not found"
			/>
		</Page>
	);
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
