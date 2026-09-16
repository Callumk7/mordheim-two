import { eq, or } from "drizzle-orm";
import type { z } from "zod";
import type { Database } from "@/db/index.server";
import { type Clock, systemClock } from "@/db/operations/clock";
import { events, warriors } from "@/db/schema";
import type {
	WarriorArchiveInputSchema,
	WarriorDeleteInputSchema,
	WarriorSchema,
	WarriorUpdateInputSchema,
} from "@/db/validation/warrior";

export async function listWarriors(db: Database) {
	const rows = await db.select().from(warriors).orderBy(warriors.name);
	return rows.map(
		({ activeImageJobId: _activeImageJobId, ...warrior }) => warrior,
	);
}

export async function createWarrior(
	db: Database,
	data: z.output<typeof WarriorSchema>,
) {
	await db.insert(warriors).values(data);
}

export async function updateWarrior(
	db: Database,
	data: z.output<typeof WarriorUpdateInputSchema>,
	clock: Clock = systemClock,
) {
	if (Object.keys(data.changes).length === 0) return;

	await db
		.update(warriors)
		.set({
			...data.changes,
			updatedAt: clock(),
		})
		.where(eq(warriors.id, data.id));
}

export async function archiveWarrior(
	db: Database,
	data: z.output<typeof WarriorArchiveInputSchema>,
	clock: Clock = systemClock,
) {
	const now = clock();
	await db
		.update(warriors)
		.set({ isArchived: true, archivedAt: now, updatedAt: now })
		.where(eq(warriors.id, data.id));
}

export async function unarchiveWarrior(
	db: Database,
	data: z.output<typeof WarriorArchiveInputSchema>,
	clock: Clock = systemClock,
) {
	await db
		.update(warriors)
		.set({ isArchived: false, archivedAt: null, updatedAt: clock() })
		.where(eq(warriors.id, data.id));
}

export async function deleteWarrior(
	db: Database,
	data: z.output<typeof WarriorDeleteInputSchema>,
) {
	const referenced = await db
		.select({ id: events.id })
		.from(events)
		.where(
			or(
				eq(events.attackerWarriorId, data.id),
				eq(events.defenderWarriorId, data.id),
			),
		)
		.limit(1);
	if (referenced.length > 0) {
		throw new Error(
			"This warrior is part of event history and cannot be deleted.",
		);
	}
	await db.delete(warriors).where(eq(warriors.id, data.id));
}
