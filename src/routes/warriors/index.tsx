import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { WarriorsTable } from "#/components/table/warriors-table";
import { LinkButton } from "@/components/ui/button";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
} from "../../components/index-page";
import { getWarbandsCollection } from "../../db-collections/warbands";
import { getWarriorsCollection } from "../../db-collections/warriors";

export const Route = createFileRoute("/warriors/")({
	component: WarriorsIndexPage,
});

function WarriorsIndexPage() {
	const { queryClient } = Route.useRouteContext();
	const warriorsCollection = getWarriorsCollection(queryClient);
	const warbandsCollection = getWarbandsCollection(queryClient);
	const { data: warriors } = useLiveQuery({
		query: (q) =>
			q
				.from({ warrior: warriorsCollection })
				.orderBy(({ warrior }) => warrior.name, "asc"),
	});
	const { data: warbands } = useLiveQuery({
		query: (q) => q.from({ warband: warbandsCollection }),
	});
	const warbandNames = new Map(
		warbands.map((warband) => [warband.id, warband.name]),
	);

	return (
		<IndexPage>
			<IndexPageHeader
				action={<LinkButton to="/warriors/new">New warrior</LinkButton>}
				description="Manage every fighter serving in the campaign’s warbands."
				eyebrow="Campaign roster"
				title="Warriors"
			/>

			{warriors.length ? (
				<WarriorsTable warbandNames={warbandNames} warriors={warriors} />
			) : (
				<IndexEmptyState
					action={<Link to="/warriors/new">Create a warrior →</Link>}
					description="Add the first fighter to a campaign warband."
					title="No warriors yet"
				/>
			)}
		</IndexPage>
	);
}
