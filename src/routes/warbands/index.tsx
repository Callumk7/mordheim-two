import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { WarbandsTable } from "#/components/table/warbands-table";
import { LinkButton } from "@/components/ui/button";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
} from "../../components/index-page";
import { getWarbandsCollection } from "../../db-collections/warbands";

export const Route = createFileRoute("/warbands/")({
	component: WarbandsIndexPage,
});

function WarbandsIndexPage() {
	const { queryClient } = Route.useRouteContext();
	const warbandsCollection = getWarbandsCollection(queryClient);
	const { data: warbands } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbandsCollection })
				.orderBy(({ warband }) => warband.name, "asc"),
	});

	return (
		<IndexPage>
			<IndexPageHeader
				action={<LinkButton to="/warbands/new">New warband</LinkButton>}
				description="Manage every company fighting through the City of the Damned."
				eyebrow="Campaign records"
				title="Warbands"
			/>

			{warbands.length ? (
				<WarbandsTable warbands={warbands} />
			) : (
				<IndexEmptyState
					action={<Link to="/warbands/new">Create a warband →</Link>}
					description="Create the first company in this campaign."
					title="No warbands yet"
				/>
			)}
		</IndexPage>
	);
}
