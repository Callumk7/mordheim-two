import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { MATCH_STATUSES } from "./match";
import { WARBAND_STATUSES } from "./warband";

export const warbands = sqliteTable("warbands", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	faction: text("faction").notNull(),
	captain: text("captain").notNull(),
	rating: integer("rating").notNull().default(0),
	wins: integer("wins").notNull().default(0),
	status: text("status", { enum: WARBAND_STATUSES })
		.notNull()
		.default("Recruiting"),
	createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type Warband = typeof warbands.$inferSelect;
export type NewWarband = typeof warbands.$inferInsert;

export const matches = sqliteTable("matches", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	scenario: text("scenario").notNull(),
	status: text("status", { enum: MATCH_STATUSES })
		.notNull()
		.default("Scheduled"),
	createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;

export const warbandMatches = sqliteTable("warband_matches", {
	id: text("id").primaryKey(),
	warbandId: text("warband_id").notNull(),
	matchId: text("match_id").notNull(),
	createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type WarbandMatch = typeof warbandMatches.$inferSelect;
export type NewWarbandMatch = typeof warbandMatches.$inferInsert;

export const events = sqliteTable(
	"events",
	{
		id: text("id").primaryKey(),
		matchId: text("match_id")
			.notNull()
			.references(() => matches.id, { onDelete: "cascade" }),
		attackerWarbandId: text("attacker_warband_id")
			.notNull()
			.references(() => warbands.id, { onDelete: "cascade" }),
		defenderWarbandId: text("defender_warband_id")
			.notNull()
			.references(() => warbands.id, { onDelete: "cascade" }),
		notes: text("notes"),
		createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
		updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [
		check(
			"events_distinct_warbands",
			sql`${table.attackerWarbandId} <> ${table.defenderWarbandId}`,
		),
	],
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
