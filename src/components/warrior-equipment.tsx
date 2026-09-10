import { useLiveQuery } from "@tanstack/react-db";
import { Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AppCollections } from "@/db-collections";
import {
	equipWarriorTransaction,
	unequipWarriorTransaction,
} from "@/db-collections/mutations/warrior-equipment";
import {
	equipmentCatalogueQuery,
	warriorEquipmentQuery,
} from "@/db-collections/queries/warrior-equipment";

export function WarriorEquipment({
	collections,
	warriorId,
}: {
	collections: AppCollections;
	warriorId: string;
}) {
	const selectId = useId();
	const [equipmentId, setEquipmentId] = useState<string>();
	const [error, setError] = useState<string>();
	const [isAdding, setIsAdding] = useState(false);
	const [removingIds, setRemovingIds] = useState<Set<string>>(() => new Set());
	const { data: catalogue, isLoading: isCatalogueLoading } = useLiveQuery({
		query: equipmentCatalogueQuery(collections),
	});
	const { data: assignments, isLoading: areAssignmentsLoading } = useLiveQuery({
		query: warriorEquipmentQuery(collections, warriorId),
	});
	const isLoading = isCatalogueLoading || areAssignmentsLoading;

	return (
		<Card className="mt-7">
			<CardContent>
				<h2 className="font-serif text-2xl text-foreground">Equipment</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Assign any catalogue item. The same item can be assigned more than
					once.
				</p>

				<form
					className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-end"
					onSubmit={async (event) => {
						event.preventDefault();
						if (!equipmentId) return;
						setError(undefined);
						setIsAdding(true);
						try {
							const transaction = equipWarriorTransaction(
								collections,
								warriorId,
								equipmentId,
							);
							await transaction.isPersisted.promise;
						} catch (cause) {
							setError(errorMessage(cause, "Unable to assign equipment."));
						} finally {
							setIsAdding(false);
						}
					}}
				>
					<Field className="sm:max-w-md">
						<FieldLabel htmlFor={selectId}>Catalogue item</FieldLabel>
						<Select
							className="w-full"
							isDisabled={isLoading || catalogue.length === 0}
							name="equipmentId"
							onChange={(key) =>
								setEquipmentId(key === null ? undefined : String(key))
							}
							placeholder={
								isLoading ? "Loading equipment…" : "Select equipment"
							}
							value={equipmentId ?? null}
						>
							<SelectTrigger id={selectId}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{catalogue.map((item) => (
									<SelectItem id={item.id} key={item.id} textValue={item.name}>
										<span className="flex flex-col">
											<span>{item.name}</span>
											<span className="text-xs text-muted-foreground">
												{equipmentSummary(item)}
											</span>
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					<Button
						isDisabled={!equipmentId || isAdding || isLoading}
						type="submit"
					>
						<Plus aria-hidden="true" data-icon="inline-start" />
						{isAdding ? "Adding…" : "Add equipment"}
					</Button>
				</form>

				<FieldError className="mt-3">{error}</FieldError>

				{isLoading ? (
					<output className="mt-6 block text-sm text-muted-foreground">
						Loading assigned equipment…
					</output>
				) : assignments.length === 0 ? (
					<p className="mt-6 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
						No equipment assigned yet.
					</p>
				) : (
					<ul className="mt-6 grid gap-3" aria-label="Assigned equipment">
						{assignments.map((assignment) => {
							const isRemoving = removingIds.has(assignment.assignmentId);
							return (
								<li
									className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/40 p-4"
									key={assignment.assignmentId}
								>
									<div className="min-w-0">
										<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
											<h3 className="font-semibold text-foreground">
												{assignment.name}
											</h3>
											<span className="text-xs capitalize text-muted-foreground">
												{assignment.type}
											</span>
										</div>
										<p className="mt-1 text-sm text-muted-foreground">
											{equipmentSummary(assignment)}
										</p>
										{assignment.specialRules.length > 0 ? (
											<p className="mt-2 text-sm text-foreground">
												<span className="font-medium">Rules:</span>{" "}
												{assignment.specialRules.join(", ")}
											</p>
										) : null}
										{assignment.notes ? (
											<p className="mt-1 text-sm text-muted-foreground">
												{assignment.notes}
											</p>
										) : null}
									</div>
									<Button
										aria-label={`Remove ${assignment.name}`}
										isDisabled={isRemoving}
										onPress={async () => {
											setError(undefined);
											setRemovingIds((current) =>
												new Set(current).add(assignment.assignmentId),
											);
											try {
												const transaction = unequipWarriorTransaction(
													collections,
													assignment.assignmentId,
												);
												await transaction.isPersisted.promise;
											} catch (cause) {
												setError(
													errorMessage(cause, "Unable to remove equipment."),
												);
											} finally {
												setRemovingIds((current) => {
													const next = new Set(current);
													next.delete(assignment.assignmentId);
													return next;
												});
											}
										}}
										size="icon-sm"
										type="button"
										variant="ghost"
									>
										<Trash2 aria-hidden="true" />
									</Button>
								</li>
							);
						})}
					</ul>
				)}

				{!isLoading && catalogue.length === 0 ? (
					<p className="mt-4 text-sm text-muted-foreground">
						The equipment catalogue is empty.
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}

function equipmentSummary(item: {
	availability: string | null;
	cost: string | null;
	range: string | null;
	save: string | null;
	strength: string | null;
	type: "weapon" | "armour";
}) {
	return (
		[
			item.cost && `Cost ${item.cost}`,
			item.availability,
			item.range && `Range ${item.range}`,
			item.strength && `Strength ${item.strength}`,
			item.save && `Save ${item.save}`,
		]
			.filter(Boolean)
			.join(" · ") ||
		`${item.type === "weapon" ? "Weapon" : "Armour"} details unavailable`
	);
}

function errorMessage(cause: unknown, fallback: string) {
	return cause instanceof Error ? cause.message : fallback;
}
