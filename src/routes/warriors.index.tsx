import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { getWarriorsCollection } from "../db-collections/warriors";

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
				action={<Link to="/warriors/new">New warrior</Link>}
				description="Manage every fighter serving in the campaign’s warbands."
				eyebrow="Campaign roster"
				title="Warriors"
			/>

			{warriors.length ? (
				<div className="overflow-hidden rounded-xl border border-border bg-card">
					<Table aria-label="Warriors" className="min-w-[760px]">
						<TableHeader>
							<TableHead isRowHeader>Warrior</TableHead>
							<TableHead>Warband</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Injuries</TableHead>
							<TableHead>Knock downs</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableHeader>
						<TableBody>
							{warriors.map((warrior) => (
								<TableRow key={warrior.id}>
									<TableCell className="[&_a]:font-semibold [&_a]:text-foreground [&_a:hover]:text-primary">
										<Link
											params={{ warriorId: warrior.id }}
											to="/warriors/$warriorId"
										>
											{warrior.name}
										</Link>
										<div className="mt-1 text-xs text-muted-foreground">
											{warrior.class}
										</div>
									</TableCell>
									<TableCell>
										{warbandNames.get(warrior.warbandId) ?? "Unknown warband"}
									</TableCell>
									<TableCell>{warrior.status}</TableCell>
									<TableCell className="font-mono text-primary">
										{warrior.injuries}
									</TableCell>
									<TableCell className="font-mono text-primary">
										{warrior.knockedDowns}
									</TableCell>
									<TableCell>
										<div className="flex justify-end gap-3 [&_a]:text-muted-foreground [&_a:hover]:text-foreground [&_a[data-danger]]:text-destructive/80 [&_a[data-danger]:hover]:text-destructive">
											<Link
												params={{ warriorId: warrior.id }}
												to="/warriors/$warriorId"
											>
												View
											</Link>
											<Link
												data-danger
												params={{ warriorId: warrior.id }}
												to="/warriors/$warriorId/delete"
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
					action={<Link to="/warriors/new">Create a warrior →</Link>}
					description="Add the first fighter to a campaign warband."
					title="No warriors yet"
				/>
			)}
		</IndexPage>
	);
}
