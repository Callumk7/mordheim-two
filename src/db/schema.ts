import { relations, sql } from "drizzle-orm";
import {
	check,
	foreignKey,
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { MATCH_STATUSES } from "./match";
import { WARBAND_STATUSES } from "./warband";
import { WARRIOR_STATUSES } from "./warrior";

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

// TODO: Stats need to be projections from events at some point.
export const warriors = sqliteTable(
	"warriors",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		class: text("class").notNull(),
		status: text("status", { enum: WARRIOR_STATUSES })
			.notNull()
			.default("Alive"),
		warbandId: text("warband_id")
			.notNull()
			.references(() => warbands.id, { onDelete: "cascade" }),
		knocked: integer("knocked").notNull().default(0),
		injuries: integer("injuries").notNull().default(0), // TODO: add an injury table
		knockedDowns: integer("knocked_downs").notNull().default(0),
		createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
		updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [
		uniqueIndex("warriors_warband_id_unique").on(table.warbandId, table.id),
	],
);

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

export const warbandMatches = sqliteTable(
	"warband_matches",
	{
		id: text("id").primaryKey(),
		warbandId: text("warband_id")
			.notNull()
			.references(() => warbands.id, { onDelete: "cascade" }),
		matchId: text("match_id")
			.notNull()
			.references(() => matches.id, { onDelete: "cascade" }),
		createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
		updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [
		uniqueIndex("warband_matches_match_warband_unique").on(
			table.matchId,
			table.warbandId,
		),
		index("warband_matches_warband_idx").on(table.warbandId),
	],
);

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
		attackerWarriorId: text("attacker_warrior_id")
			.notNull()
			.references(() => warriors.id, { onDelete: "cascade" }),
		defenderWarbandId: text("defender_warband_id")
			.notNull()
			.references(() => warbands.id, { onDelete: "cascade" }),
		defenderWarriorId: text("defender_warrior_id")
			.notNull()
			.references(() => warriors.id, { onDelete: "cascade" }),
		notes: text("notes"),
		createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
		updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [
		check(
			"events_distinct_warbands",
			sql`${table.attackerWarbandId} <> ${table.defenderWarbandId}`,
		),
		foreignKey({
			name: "events_attacker_participant_fk",
			columns: [table.matchId, table.attackerWarbandId],
			foreignColumns: [warbandMatches.matchId, warbandMatches.warbandId],
		}),
		foreignKey({
			name: "events_defender_participant_fk",
			columns: [table.matchId, table.defenderWarbandId],
			foreignColumns: [warbandMatches.matchId, warbandMatches.warbandId],
		}),
		foreignKey({
			name: "events_attacker_warrior_membership_fk",
			columns: [table.attackerWarbandId, table.attackerWarriorId],
			foreignColumns: [warriors.warbandId, warriors.id],
		}),
		foreignKey({
			name: "events_defender_warrior_membership_fk",
			columns: [table.defenderWarbandId, table.defenderWarriorId],
			foreignColumns: [warriors.warbandId, warriors.id],
		}),
	],
);

export const warbandsRelations = relations(warbands, ({ many }) => ({
	warriors: many(warriors),
	warbandMatches: many(warbandMatches),
	attackingEvents: many(events, { relationName: "attackerWarband" }),
	defendingEvents: many(events, { relationName: "defenderWarband" }),
}));

export const warriorsRelations = relations(warriors, ({ one }) => ({
	warband: one(warbands, {
		fields: [warriors.warbandId],
		references: [warbands.id],
	}),
}));

export const matchesRelations = relations(matches, ({ many }) => ({
	warbandMatches: many(warbandMatches),
	events: many(events),
}));

export const warbandMatchesRelations = relations(warbandMatches, ({ one }) => ({
	warband: one(warbands, {
		fields: [warbandMatches.warbandId],
		references: [warbands.id],
	}),
	match: one(matches, {
		fields: [warbandMatches.matchId],
		references: [matches.id],
	}),
}));

export const eventsRelations = relations(events, ({ one }) => ({
	match: one(matches, {
		fields: [events.matchId],
		references: [matches.id],
	}),
	attackerWarband: one(warbands, {
		fields: [events.attackerWarbandId],
		references: [warbands.id],
		relationName: "attackerWarband",
	}),
	attackerWarrior: one(warriors, {
		fields: [events.attackerWarriorId],
		references: [warriors.id],
		relationName: "attackerWarrior",
	}),
	defenderWarband: one(warbands, {
		fields: [events.defenderWarbandId],
		references: [warbands.id],
		relationName: "defenderWarband",
	}),
	defenderWarrior: one(warriors, {
		fields: [events.defenderWarriorId],
		references: [warriors.id],
		relationName: "defenderWarrior",
	}),
}));
