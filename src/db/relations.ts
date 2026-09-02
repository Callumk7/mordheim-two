import { z } from "zod";
import { EventSchema } from "./event";
import { MatchSchema } from "./match";
import { WarbandSchema } from "./warband";
import { WarriorSchema } from "./warrior";

const WarbandMatchSchema = z.object({
	id: z.string().min(1),
	warbandId: z.string().min(1),
	matchId: z.string().min(1),
	createdAt: z.string(),
	updatedAt: z.string(),
});

/** Schemas for the nested records returned by Drizzle relational queries. */
export const WarbandWithRelationsSchema = WarbandSchema.extend({
	warriors: z.array(WarriorSchema).optional(),
	warbandMatches: z
		.array(WarbandMatchSchema.extend({ match: MatchSchema }))
		.optional(),
	attackingEvents: z.array(EventSchema).optional(),
	defendingEvents: z.array(EventSchema).optional(),
});

export const WarriorWithRelationsSchema = WarriorSchema.extend({
	warband: WarbandSchema.optional(),
});

export const MatchWithRelationsSchema = MatchSchema.extend({
	warbandMatches: z
		.array(WarbandMatchSchema.extend({ warband: WarbandSchema }))
		.optional(),
	events: z.array(EventSchema).optional(),
});

export const EventWithRelationsSchema = EventSchema.extend({
	match: MatchSchema.optional(),
	attackerWarband: WarbandSchema.optional(),
	defenderWarband: WarbandSchema.optional(),
});

export type WarbandWithRelations = z.output<typeof WarbandWithRelationsSchema>;
export type WarriorWithRelations = z.output<typeof WarriorWithRelationsSchema>;
export type MatchWithRelations = z.output<typeof MatchWithRelationsSchema>;
export type EventWithRelations = z.output<typeof EventWithRelationsSchema>;
