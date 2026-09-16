import { useLiveQuery } from "@tanstack/react-db";
import { Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Typography } from "@/components/shared/typography";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AppCollections } from "@/db-collections";
import {
	assignSkillTransaction,
	createAndAssignSkillTransaction,
	removeSkillTransaction,
} from "@/db-collections/mutations/warrior-skills";
import {
	skillsCatalogueQuery,
	warriorSkillsQuery,
} from "@/db-collections/queries/warrior-skills";

export function WarriorSkills({
	collections,
	warriorId,
}: {
	collections: AppCollections;
	warriorId: string;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [error, setError] = useState<string>();
	const [removingIds, setRemovingIds] = useState<Set<string>>(() => new Set());
	const { data: catalogue, isLoading: isCatalogueLoading } = useLiveQuery({
		query: skillsCatalogueQuery(collections),
	});
	const { data: assignments, isLoading: areAssignmentsLoading } = useLiveQuery({
		query: warriorSkillsQuery(collections, warriorId),
	});
	const isLoading = isCatalogueLoading || areAssignmentsLoading;

	return (
		<Card className="mt-7">
			<CardContent>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<Typography variant="sectionTitle" className="text-foreground">
							Skills
						</Typography>
						<p className="mt-1 text-sm text-muted-foreground">
							Abilities and advances learned by this warrior.
						</p>
					</div>
					<Button isDisabled={isLoading} onPress={() => setIsOpen(true)}>
						<Plus aria-hidden="true" data-icon="inline-start" />
						Assign skill
					</Button>
				</div>

				<FieldError className="mt-3">{error}</FieldError>
				{isLoading ? (
					<output className="mt-6 block text-sm text-muted-foreground">
						Loading skills…
					</output>
				) : assignments.length === 0 ? (
					<p className="mt-6 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
						No skills assigned yet.
					</p>
				) : (
					<ul className="mt-6 grid gap-3" aria-label="Assigned skills">
						{assignments.map((assignment) => (
							<li
								className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/40 p-4"
								key={assignment.assignmentId}
							>
								<div className="min-w-0">
									<h3 className="font-semibold text-foreground">
										{assignment.name}
									</h3>
									<p className="mt-1 text-sm text-muted-foreground">
										{assignment.description}
									</p>
								</div>
								<Button
									aria-label={`Remove ${assignment.name}`}
									isDisabled={removingIds.has(assignment.assignmentId)}
									onPress={async () => {
										setError(undefined);
										setRemovingIds((current) =>
											new Set(current).add(assignment.assignmentId),
										);
										try {
											const transaction = removeSkillTransaction(
												collections,
												assignment.assignmentId,
											);
											await transaction.isPersisted.promise;
										} catch (cause) {
											setError(errorMessage(cause, "Unable to remove skill."));
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
						))}
					</ul>
				)}
			</CardContent>

			<AssignSkillDialog
				assignments={assignments}
				catalogue={catalogue}
				collections={collections}
				isOpen={isOpen}
				onOpenChange={setIsOpen}
				onError={setError}
				warriorId={warriorId}
			/>
		</Card>
	);
}

function AssignSkillDialog({
	assignments,
	catalogue,
	collections,
	isOpen,
	onError,
	onOpenChange,
	warriorId,
}: {
	assignments: Array<{ skillId: string }>;
	catalogue: Array<{ id: string; name: string; description: string }>;
	collections: AppCollections;
	isOpen: boolean;
	onError: (message: string | undefined) => void;
	onOpenChange: (isOpen: boolean) => void;
	warriorId: string;
}) {
	const selectId = useId();
	const nameId = useId();
	const descriptionId = useId();
	const [skillId, setSkillId] = useState<string>();
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [dialogError, setDialogError] = useState<string>();
	const assignedIds = new Set(
		assignments.map((assignment) => assignment.skillId),
	);
	const availableSkills = catalogue.filter(
		(skill) => !assignedIds.has(skill.id),
	);

	async function submit(action: () => Promise<unknown>) {
		onError(undefined);
		setDialogError(undefined);
		setIsSubmitting(true);
		try {
			await action();
			onOpenChange(false);
			setSkillId(undefined);
			setName("");
			setDescription("");
		} catch (cause) {
			setDialogError(errorMessage(cause, "Unable to assign skill."));
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
			<DialogHeader>
				<DialogTitle>Assign skill</DialogTitle>
				<DialogDescription>
					Choose a catalogue skill or define a new one.
				</DialogDescription>
			</DialogHeader>
			<FieldError>{dialogError}</FieldError>
			<Tabs defaultSelectedKey="existing">
				<TabsList aria-label="Skill source">
					<TabsTrigger id="existing">Existing skill</TabsTrigger>
					<TabsTrigger id="new">Create new</TabsTrigger>
				</TabsList>
				<TabsContent id="existing">
					<form
						className="mt-4 grid gap-5"
						onSubmit={(event) => {
							event.preventDefault();
							if (!skillId) return;
							void submit(async () => {
								const transaction = assignSkillTransaction(
									collections,
									warriorId,
									skillId,
								);
								await transaction.isPersisted.promise;
							});
						}}
					>
						<Field>
							<FieldLabel htmlFor={selectId}>Skill</FieldLabel>
							<Combobox
								allowsEmptyCollection
								isDisabled={availableSkills.length === 0}
								onSelectionChange={(key) =>
									setSkillId(key === null ? undefined : String(key))
								}
								selectedKey={skillId ?? null}
							>
								<ComboboxInput id={selectId} placeholder="Search skills" />
								<ComboboxContent>
									<ComboboxList
										renderEmptyState={() => (
											<ComboboxEmpty>No available skills found.</ComboboxEmpty>
										)}
									>
										{availableSkills.map((skill) => (
											<ComboboxItem
												id={skill.id}
												key={skill.id}
												textValue={skill.name}
											>
												<span className="flex flex-col">
													<span>{skill.name}</span>
													<span className="text-xs text-muted-foreground">
														{skill.description}
													</span>
												</span>
											</ComboboxItem>
										))}
									</ComboboxList>
								</ComboboxContent>
							</Combobox>
						</Field>
						<Button isDisabled={!skillId || isSubmitting} type="submit">
							{isSubmitting ? "Assigning…" : "Assign skill"}
						</Button>
					</form>
				</TabsContent>
				<TabsContent id="new">
					<form
						className="mt-4 grid gap-5"
						onSubmit={(event) => {
							event.preventDefault();
							const existing = catalogue.find(
								(skill) =>
									skill.name.toLocaleLowerCase() ===
									name.trim().toLocaleLowerCase(),
							);
							if (existing && assignedIds.has(existing.id)) {
								setDialogError("This warrior already has that skill.");
								return;
							}
							void submit(async () => {
								const transaction = existing
									? assignSkillTransaction(collections, warriorId, existing.id)
									: await createAndAssignSkillTransaction(
											collections,
											warriorId,
											{
												name: name.trim(),
												description: description.trim(),
											},
										);
								await transaction.isPersisted.promise;
							});
						}}
					>
						<Field>
							<FieldLabel htmlFor={nameId}>Name</FieldLabel>
							<Input
								id={nameId}
								onChange={(event) => setName(event.target.value)}
								required
								value={name}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
							<Textarea
								id={descriptionId}
								onChange={(event) => setDescription(event.target.value)}
								required
								value={description}
							/>
						</Field>
						<Button
							isDisabled={!name.trim() || !description.trim() || isSubmitting}
							type="submit"
						>
							{isSubmitting ? "Creating…" : "Create and assign skill"}
						</Button>
					</form>
				</TabsContent>
			</Tabs>
		</Dialog>
	);
}

function errorMessage(cause: unknown, fallback: string) {
	return cause instanceof Error ? cause.message : fallback;
}
