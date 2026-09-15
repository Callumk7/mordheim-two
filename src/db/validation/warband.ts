import { z } from "zod";

export const WarbandFieldsSchema = z.object({
	name: z.string().trim().min(1),
	faction: z.string().trim().min(1),
	bio: z.string().trim().nullish(),
	rating: z.number().int().nonnegative(),
	gold: z.number().int().nonnegative(),
	wins: z.number().int().nonnegative(),
});

const archiveFields = {
	isArchived: z.boolean().default(false),
	archivedAt: z.string().datetime({ offset: true }).nullable().default(null),
};

export const WarbandSchema = WarbandFieldsSchema.extend({
	id: z.string().min(1),
	...archiveFields,
	createdAt: z.string().default(() => new Date().toISOString()),
	updatedAt: z.string().default(() => new Date().toISOString()),
}).superRefine((warband, context) => {
	if (warband.isArchived !== (warband.archivedAt !== null)) {
		context.addIssue({
			code: "custom",
			message: "Archived warbands must have an archive timestamp.",
			path: ["archivedAt"],
		});
	}
});

// Archival state is changed only through the dedicated operations below.
export const WarbandUpdateSchema = WarbandFieldsSchema.partial().strict();

export const WarbandUpdateInputSchema = z.object({
	id: z.string().min(1),
	changes: WarbandUpdateSchema,
});

export const WarbandArchiveInputSchema = z.object({ id: z.string().min(1) });

export const WarbandDeleteInputSchema = WarbandArchiveInputSchema;

export type Warband = z.output<typeof WarbandSchema>;
