import type { DbClient } from "@tanstack/react-db";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
	dbClient: DbClient;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Mordheim Campaign Ledger",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="dark min-h-screen">
				<header className="border-b border-border backdrop-blur">
					<div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-8">
						<nav
							aria-label="Primary navigation"
							className="flex items-center gap-2 text-sm"
						>
							<Link
								activeOptions={{ exact: true }}
								activeProps={{ className: "bg-accent text-primary" }}
								className="rounded-md px-3 py-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
								to="/"
							>
								Home
							</Link>
							<Link
								activeProps={{ className: "bg-accent text-primary" }}
								className="rounded-md px-3 py-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
								to="/warbands"
							>
								Warbands
							</Link>
							<Link
								activeProps={{ className: "bg-accent text-primary" }}
								className="rounded-md px-3 py-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
								to="/warriors"
							>
								Warriors
							</Link>
							<Link
								activeProps={{ className: "bg-accent text-primary" }}
								className="rounded-md px-3 py-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
								to="/matches"
							>
								Matches
							</Link>
							<Link
								activeProps={{ className: "bg-accent text-primary" }}
								className="rounded-md px-3 py-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
								to="/events"
							>
								Events
							</Link>
						</nav>
					</div>
				</header>
				{children}
				<TanStackDevtools
					config={{
						position: "bottom-right",
						triggerMode: "fixed",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
