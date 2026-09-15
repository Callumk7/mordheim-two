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
		links: [
			{
				rel: "preload",
				href: schoenspergerFontUrl,
				as: "font",
				type: "font/otf",
				crossOrigin: "anonymous",
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

type PrimaryNavTarget = "/" | "/equipment" | "/settings";

function NavLink({
	children,
	to,
}: {
	children: React.ReactNode;
	to: PrimaryNavTarget;
}) {
	return (
		<Link
			activeOptions={to === "/" ? { exact: true } : undefined}
			activeProps={{ className: "bg-accent text-primary" }}
			className="rounded-md px-3 py-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
			to={to}
		>
			{children}
		</Link>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const { isCampaign, isProjector } = useRouterState({
		select: (state) => {
			const pathname = state.location.pathname;
			return {
				isCampaign: pathname.startsWith("/campaigns/"),
				isProjector:
					pathname === "/projector" || pathname.includes("/projector"),
			};
		},
	});
	const showGlobalChrome = !isProjector && !isCampaign;
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="dark min-h-screen">
				{showGlobalChrome && (
					<header className="border-b border-border backdrop-blur">
						<div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-8">
							<nav
								aria-label="Primary navigation"
								className="flex flex-wrap items-center gap-2 text-sm"
							>
								<NavLink to="/">Home</NavLink>
								<NavLink to="/equipment">Equipment</NavLink>
								<NavLink to="/settings">Settings</NavLink>
							</nav>
						</div>
					</header>
				)}
				{children}
				{showGlobalChrome && (
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
