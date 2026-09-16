import { createFileRoute } from "@tanstack/react-router";
import {
	ArchiveAction,
	ArchivedBanner,
} from "@/components/shared/archive-controls";
import { EntityHeader, EntityToolbar } from "@/components/shared/entity-chrome";
import { CombatStatValue, StatTile } from "@/components/shared/stat-display";
import { Typography } from "@/components/shared/typography";
import { WarriorEquipment } from "@/components/warrior-equipment";
import { WarriorPortrait } from "@/components/warrior-portrait";
import { getCollections } from "@/db-collections";
import { useWarriorMutations } from "@/db-collections/mutations/warriors";
import {
	type CombatStatKey,
	type CombatStats,
	getWarriorCombatStats,
	projectCombatStats,
} from "@/db-collections/projections";
import { useWarriorDetails } from "@/db-collections/queries";
import { getWarriorPortrait } from "@/server/warrior-portraits";
import { Card, CardContent } from "@/components/ui/card";
import { WarriorForm } from "@/components/warrior-form";

export const Route = createFileRoute(
	"/campaigns/$campaignId/warriors/$warriorId/",
)({
	loader: ({ params }) =>
		getWarriorPortrait({ data: { warriorId: params.warriorId } }),
	component: WarriorDetailPage,
});

function WarriorDetailPage() {
	const { campaignId, warriorId } = Route.useParams();
	const portrait = Route.useLoaderData();
	const { dbClient } = Route.useRouteContext();
	const collections = getCollections(dbClient);
	const { setWarriorArchived, updateWarrior } = useWarriorMutations(dbClient);
	const { eventReferences, warbands, warrior } = useWarriorDetails(
		dbClient,
		campaignId,
		warriorId,
	);
	const combat = getWarriorCombatStats(
		projectCombatStats(eventReferences, warrior ? [warrior] : []),
		warriorId,
	);
	const warband = warbands.find(
		(candidate) => candidate.id === warrior?.warbandId,
	);

	if (!warrior) return null;

	return (
		<div className="mx-auto max-w-3xl">
			<EntityToolbar
				actions={
					<ArchiveAction
						entityLabel="warrior"
						isArchived={warrior.isArchived}
						name={warrior.name}
						onConfirm={() =>
							setWarriorArchived(warrior.id, !warrior.isArchived)
						}
					/>
				}
				backLabel="← Warriors"
				backLink={{
					params: { campaignId },
					to: "/campaigns/$campaignId/warriors",
				}}
				destructiveLabel="Delete warrior"
				destructiveLink={{
					params: { campaignId, warriorId },
					to: "/campaigns/$campaignId/warriors/$warriorId/delete",
				}}
			/>

			{warrior.isArchived && warrior.archivedAt ? (
				<div className="mt-7">
					<ArchivedBanner archivedAt={warrior.archivedAt} />
				</div>
			) : null}

			<EntityHeader
				className="mt-7 border-b border-border pb-6"
				description="Edit this warrior’s campaign record."
				eyebrow={
					<>
						{warband?.name ?? "Unknown warband"} · {warrior.class}
					</>
				}
				title={warrior.name}
			/>

			<WarriorPortrait
				key={warrior.id}
				warriorId={warrior.id}
				name={warrior.name}
				portrait={portrait}
			/>

			<WarriorEquipment collections={collections} warriorId={warrior.id} />

			<Card className="mt-7">
				<CardContent>
					<Typography variant="sectionTitle" className="text-foreground">
						Combat stats
					</Typography>
					<dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
						<StatTile
							label="Status"
							value={combat.isDead ? "Dead" : "Alive"}
							variant="compact"
						/>
						<CombatStat
							label="Knockdowns given"
							stat="knockdownsGiven"
							stats={combat}
						/>
						<CombatStat
							label="Knockdowns taken"
							stat="knockdownsTaken"
							stats={combat}
						/>
						<CombatStat
							label="Injuries given"
							stat="injuriesGiven"
							stats={combat}
						/>
						<CombatStat
							label="Injuries taken"
							stat="injuriesTaken"
							stats={combat}
						/>
						<CombatStat
							label="Deaths given"
							stat="deathsGiven"
							stats={combat}
						/>
					</dl>
				</CardContent>
			</Card>

			<Card className="mt-7">
				<CardContent>
					<Typography variant="sectionTitle" className="mb-2 text-foreground">
						Profile and manual corrections
					</Typography>
					<Typography variant="supportingBody" className="mb-6">
						Signed corrections are added to combat totals calculated from
						events.
					</Typography>
					<WarriorForm
						initialValues={warrior}
						isWarbandLocked={eventReferences.length > 0}
						key={warrior.id}
						onSubmit={(values) => updateWarrior(warrior.id, values)}
						submitLabel="Save changes"
						warbands={warbands}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

function CombatStat({
	label,
	stat,
	stats,
}: {
	label: string;
	stat: CombatStatKey;
	stats: CombatStats;
}) {
	return (
		<StatTile
			label={label}
			value={<CombatStatValue stat={stat} stats={stats} />}
			variant="compact"
		/>
	);
}
