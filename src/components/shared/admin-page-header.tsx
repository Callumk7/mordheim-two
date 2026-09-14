import type { ReactNode } from "react";
import { Typography } from "@/components/shared/typography";
import { Button, LinkButton } from "@/components/ui/button";

type AdminPage = "generated-images" | "queue" | "queue-jobs" | "settings";

type RelatedLink = {
	label: string;
	to: "/generated-images" | "/queue" | "/queue-jobs" | "/settings";
};

const relatedLinks = {
	settings: [
		{ label: "Queue playground", to: "/queue" },
		{ label: "View D1 jobs", to: "/queue-jobs" },
		{ label: "View generated images", to: "/generated-images" },
	],
	queue: [
		{ label: "View D1 jobs", to: "/queue-jobs" },
		{ label: "View generated images", to: "/generated-images" },
		{ label: "Image instructions", to: "/settings" },
	],
	"queue-jobs": [
		{ label: "View generated images", to: "/generated-images" },
		{ label: "Send a job", to: "/queue" },
		{ label: "Image instructions", to: "/settings" },
	],
	"generated-images": [
		{ label: "Send a job", to: "/queue" },
		{ label: "View D1 jobs", to: "/queue-jobs" },
		{ label: "Image instructions", to: "/settings" },
	],
} satisfies Record<AdminPage, ReadonlyArray<RelatedLink>>;

export function AdminPageHeader({
	currentPage,
	description,
	isRefreshing = false,
	onRefresh,
	title,
}: {
	currentPage: AdminPage;
	description: ReactNode;
	isRefreshing?: boolean;
	onRefresh?: () => void;
	title: ReactNode;
}) {
	return (
		<header className="space-y-4 border-b border-border pb-7">
			<div>
				<Typography variant="pageTitle" className="text-foreground">
					{title}
				</Typography>
				<Typography variant="supportingBody" className="mt-2">
					{description}
				</Typography>
			</div>
			<nav aria-label="Related admin pages" className="flex flex-wrap gap-2">
				{relatedLinks[currentPage].map((link) => (
					<LinkButton key={link.to} to={link.to} variant="outline">
						{link.label}
					</LinkButton>
				))}
				{onRefresh && (
					<Button isDisabled={isRefreshing} onPress={onRefresh}>
						{isRefreshing ? "Refreshing…" : "Refresh"}
					</Button>
				)}
			</nav>
		</header>
	);
}
