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
			<body className="min-h-screen bg-[#0c0b09] text-stone-300">
				<header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur">
					<div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-8">
						<Link
							className="font-serif text-xl font-semibold text-stone-100"
							to="/"
						>
							Mordheim Ledger
						</Link>
						<nav
							aria-label="Primary navigation"
							className="flex items-center gap-2 text-sm"
						>
							<Link
								activeOptions={{ exact: true }}
								activeProps={{ className: "bg-stone-800 text-amber-300" }}
								className="rounded-md px-3 py-2 text-stone-400 transition hover:bg-stone-900 hover:text-stone-100"
								to="/"
							>
								Home
							</Link>
							<Link
								activeProps={{ className: "bg-stone-800 text-amber-300" }}
								className="rounded-md px-3 py-2 text-stone-400 transition hover:bg-stone-900 hover:text-stone-100"
								to="/warbands"
							>
								Warbands
							</Link>
							<Link
								activeProps={{ className: "bg-stone-800 text-amber-300" }}
								className="rounded-md px-3 py-2 text-stone-400 transition hover:bg-stone-900 hover:text-stone-100"
								to="/matches"
							>
								Matches
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
