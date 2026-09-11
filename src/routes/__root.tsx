import type { DbClient } from "@tanstack/react-db";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import schoenspergerFontUrl from "../../fonts/Schoensperger.otf?url";
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
		styles: [
			{
				children: `@font-face{font-family:'Schoensperger';src:url('${schoenspergerFontUrl}') format('opentype');font-style:normal;font-weight:400;font-display:block}`,
			},
		],
		links: [
			{
				rel: "preload",
				href: schoenspergerFontUrl,
				as: "font",
				type: "font/otf",
				crossOrigin: "anonymous",
				fetchPriority: "high",
				blocking: "render",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				sizes: "any",
			},
			{
				rel: "icon",
				href: "/favicon-32x32.png",
				type: "image/png",
				sizes: "32x32",
			},
			{
				rel: "icon",
				href: "/favicon-16x16.png",
				type: "image/png",
				sizes: "16x16",
			},
			{
				rel: "manifest",
				href: "/site.webmanifest",
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	const isProjector = useRouterState({
		select: (state) =>
			state.location.pathname === "/projector" ||
			state.location.pathname.startsWith("/projector/"),
	});
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="dark min-h-screen">
				{!isProjector && (
					<header className="border-b border-border backdrop-blur">
						<div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-8">
							<nav
								aria-label="Primary navigation"
								className="flex flex-wrap items-center gap-2 text-sm"
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
									to="/equipment"
								>
									Equipment
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
									to="/stats"
								>
									Stats
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
				)}
				{children}
				{!isProjector && (
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
				)}
				<Scripts />
			</body>
		</html>
	);
}
