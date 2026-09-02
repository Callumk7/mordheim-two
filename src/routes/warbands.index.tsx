import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LinkButton } from "@/components/ui/button";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
} from "../components/index-page";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../components/ui/table";
import { getWarbandsCollection } from "../db-collections/warbands";

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
				<div className="overflow-hidden rounded-xl border border-border bg-card">
					<Table aria-label="Warbands" className="min-w-180">
						<TableHeader>
							<TableHead isRowHeader>Warband</TableHead>
							<TableHead>Captain</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Rating</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableHeader>
						<TableBody>
							{warbands.map((warband) => (
								<TableRow key={warband.id}>
									<TableCell className="[&_a]:font-semibold [&_a]:text-foreground [&_a:hover]:text-primary">
										<Link
											params={{ warbandId: warband.id }}
											to="/warbands/$warbandId"
										>
											{warband.name}
										</Link>
										<div className="mt-1 text-xs text-muted-foreground">
											{warband.faction}
										</div>
									</TableCell>
									<TableCell>{warband.captain}</TableCell>
									<TableCell>{warband.status}</TableCell>
									<TableCell className="font-mono text-primary">
										{warband.rating}
									</TableCell>
									<TableCell>
										<div className="flex justify-end gap-3 [&_a]:text-muted-foreground [&_a:hover]:text-foreground [&_a[data-danger]]:text-destructive/80 [&_a[data-danger]:hover]:text-destructive">
											<Link
												params={{ warbandId: warband.id }}
												to="/warbands/$warbandId"
											>
												View
											</Link>
											<Link
												data-danger
												params={{ warbandId: warband.id }}
												to="/warbands/$warbandId/delete"
											>
												Delete
											</Link>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
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
