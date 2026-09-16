import z from "zod";

export const WARRIOR_STATUSES = ["Alive", "Dead"] as const;

export const WarriorStatusSchema = z.enum(WARRIOR_STATUSES);

export const WarriorFieldsSchema = z.object({
	name: z.string().trim().min(1),
	class: z.string().trim().min(1),
	description: z.string().trim().nullable().optional(),
	status: WarriorStatusSchema,
	warbandId: z.string().min(1),
	experience: z.number().int().nonnegative(),
	knocked: z.number().int(),
	injuries: z.number().int(),
	knockedDowns: z.number().int(),
});

const archiveFields = {
	isArchived: z.boolean().default(false),
	archivedAt: z.string().datetime({ offset: true }).nullable().default(null),
};

export const WarriorSchema = WarriorFieldsSchema.extend({
	experience: WarriorFieldsSchema.shape.experience.default(0),
	id: z.string().min(1),
	campaignId: z.string().min(1),
	...archiveFields,
	createdAt: z.string().default(() => new Date().toISOString()),
	updatedAt: z.string().default(() => new Date().toISOString()),
}).superRefine((warrior, context) => {
	if (warrior.isArchived !== (warrior.archivedAt !== null)) {
		context.addIssue({
			code: "custom",
			message: "Archived warriors must have an archive timestamp.",
			path: ["archivedAt"],
		});
	}
});

// Archival state is changed only through the dedicated operations below.
export const WarriorUpdateSchema = WarriorFieldsSchema.partial().strict();

export const WarriorUpdateInputSchema = z.object({
	id: z.string().min(1),
	changes: WarriorUpdateSchema,
});

export const WarriorArchiveInputSchema = z.object({ id: z.string().min(1) });

export const WarriorDeleteInputSchema = WarriorArchiveInputSchema;

export type Warrior = z.output<typeof WarriorSchema>;
