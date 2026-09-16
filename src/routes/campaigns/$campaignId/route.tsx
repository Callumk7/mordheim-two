import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { NotFoundPanel } from "@/components/shared/entity-chrome";
import { Page } from "@/components/shared/page";
import { Typography } from "@/components/shared/typography";
import { getCollections } from "@/db-collections";

export const Route = createFileRoute("/campaigns/$campaignId")({
	ssr: false,
	loader: async ({ context, params }) => {
		const { campaigns } = getCollections(context.dbClient);
		await campaigns.preload();
		if (!campaigns.get(params.campaignId)) throw notFound();
		return null;
	},
	component: CampaignLayout,
	notFoundComponent: MissingCampaign,
});

type CampaignNavTarget =
	| "/"
	| "/campaigns/$campaignId/warbands"
	| "/campaigns/$campaignId/warriors"
	| "/campaigns/$campaignId/matches"
	| "/campaigns/$campaignId/events"
	| "/campaigns/$campaignId/stats"
	| "/equipment"
	| "/settings";

function NavLink({
	campaignId,
	children,
	exact,
	to,
}: {
	campaignId?: string;
	children: React.ReactNode;
	exact?: boolean;
	to: CampaignNavTarget;
}) {
	return (
		<Link
			activeOptions={exact ? { exact: true } : undefined}
			activeProps={{ className: "bg-accent text-primary" }}
			className="rounded-md px-3 py-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
			params={campaignId ? { campaignId } : undefined}
			to={to}
		>
			{children}
		</Link>
	);
}

function CampaignLayout() {
	const { campaignId } = Route.useParams();
	const { dbClient } = Route.useRouteContext();
	const campaign = getCollections(dbClient).campaigns.get(campaignId);
	const isProjector = useRouterState({
		select: (state) => state.location.pathname.includes("/projector"),
	});

	return (
		<>
			{!isProjector && (
				<header className="border-b border-border backdrop-blur">
					<div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-8">
						{campaign ? (
							<Typography variant="eyebrow" className="text-foreground">
								{campaign.name}
							</Typography>
						) : null}
						<nav
							aria-label="Campaign navigation"
							className="flex flex-wrap items-center gap-2 text-sm"
						>
							<NavLink exact to="/">
								Campaigns
							</NavLink>
							<NavLink
								campaignId={campaignId}
								to="/campaigns/$campaignId/warbands"
							>
								Warbands
							</NavLink>
							<NavLink
								campaignId={campaignId}
								to="/campaigns/$campaignId/warriors"
							>
								Warriors
							</NavLink>
							<NavLink
								campaignId={campaignId}
								to="/campaigns/$campaignId/matches"
							>
								Matches
							</NavLink>
							<NavLink
								campaignId={campaignId}
								to="/campaigns/$campaignId/events"
							>
								Events
							</NavLink>
							<NavLink
								campaignId={campaignId}
								to="/campaigns/$campaignId/stats"
							>
								Stats
							</NavLink>
							<NavLink to="/equipment">Equipment</NavLink>
							<NavLink to="/settings">Settings</NavLink>
						</nav>
					</div>
				</header>
			)}
			<Outlet />
		</>
	);
}

function MissingCampaign() {
	const { campaignId } = Route.useParams();

	return (
		<Page padding="loose">
			<NotFoundPanel
				description={
					<>No campaign exists with the identifier “{campaignId}”.</>
				}
				link={{ to: "/" }}
				linkLabel="Return to campaigns →"
				title="Unknown campaign"
			/>
		</Page>
	);
}
