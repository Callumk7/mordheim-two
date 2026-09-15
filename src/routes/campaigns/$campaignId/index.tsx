import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/campaigns/$campaignId/")({
	beforeLoad: ({ params }) => {
		throw redirect({
			params,
			to: "/campaigns/$campaignId/warbands",
		});
	},
});
