import { relations, sql } from "drizzle-orm";
import {
	type AnySQLiteColumn,
	check,
	foreignKey,
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { EVENT_OUTCOMES } from "./validation/event";
import { MATCH_RESULTS, MATCH_STATUSES } from "./validation/match";
import { WARBAND_STATUSES } from "./validation/warband";
import { WARRIOR_STATUSES } from "./validation/warrior";

export const imageGenerationJobs = sqliteTable("image_generation_jobs", {
	id: text("id").primaryKey(),
	prompt: text("prompt").notNull(),
	status: text("status", {
		enum: [
			"pending",
			"queued",
			"enqueue_failed",
			"consumed",
			"processing",
			"completed",
			"failed",
		],
	})
		.notNull()
		.default("pending"),
	error: text("error"),
	leaseToken: text("lease_token"),
	leaseExpiresAt: integer("lease_expires_at"),
	resultKey: text("result_key"),
	resultMimeType: text("result_mime_type"),
	resultBytes: integer("result_bytes"),
	resultEtag: text("result_etag"),
	resultModel: text("result_model"),
	completedAt: text("completed_at"),
	createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

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

export const warbandMatches = sqliteTable(
	"warband_matches",
	{
		id: text("id").primaryKey(),
		warbandId: text("warband_id")
			.notNull()
			.references(() => warbands.id, { onDelete: "cascade" }),
		matchId: text("match_id")
			.notNull()
			.references((): AnySQLiteColumn => matches.id, { onDelete: "cascade" }),
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

export const matches = sqliteTable(
	"matches",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		scenario: text("scenario").notNull(),
		status: text("status", { enum: MATCH_STATUSES })
			.notNull()
			.default("Scheduled"),
		result: text("result", { enum: MATCH_RESULTS })
			.notNull()
			.default("Pending"),
		winnerWarbandId: text("winner_warband_id"),
		createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
		updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [
		check(
			"matches_result_winner_consistent",
			sql`(${table.result} = 'Pending' AND ${table.winnerWarbandId} IS NULL) OR (${table.result} = 'Draw' AND ${table.winnerWarbandId} IS NULL) OR (${table.result} = 'Victory' AND ${table.winnerWarbandId} IS NOT NULL)`,
		),
		foreignKey({
			name: "matches_winner_participant_fk",
			columns: [table.id, table.winnerWarbandId],
			foreignColumns: [warbandMatches.matchId, warbandMatches.warbandId],
		}),
	],
);

export const events = sqliteTable(
	"events",
	{
		id: text("id").primaryKey(),
		matchId: text("match_id")
			.notNull()
			.references(() => matches.id, { onDelete: "restrict" }),
		attackerWarbandId: text("attacker_warband_id")
			.notNull()
			.references(() => warbands.id, { onDelete: "restrict" }),
		attackerWarriorId: text("attacker_warrior_id")
			.notNull()
			.references(() => warriors.id, { onDelete: "restrict" }),
		defenderWarbandId: text("defender_warband_id")
			.notNull()
			.references(() => warbands.id, { onDelete: "restrict" }),
		defenderWarriorId: text("defender_warrior_id")
			.notNull()
			.references(() => warriors.id, { onDelete: "restrict" }),
		notes: text("notes"),
		isProcessed: integer("is_processed", { mode: "boolean" })
			.notNull()
			.default(false),
		outcome: text("outcome", { enum: EVENT_OUTCOMES }),
		resolvedAt: text("resolved_at"),
		voidedAt: text("voided_at"),
		voidReason: text("void_reason"),
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
		index("events_match_idx").on(table.matchId),
		index("events_attacker_warrior_idx").on(table.attackerWarriorId),
		index("events_defender_warrior_idx").on(table.defenderWarriorId),
		index("events_attacker_warband_idx").on(table.attackerWarbandId),
		index("events_defender_warband_idx").on(table.defenderWarbandId),
		uniqueIndex("events_effective_death_defender_unique")
			.on(table.defenderWarriorId)
			.where(
				sql`${table.outcome} = 'Death' AND ${table.resolvedAt} IS NOT NULL AND ${table.voidedAt} IS NULL`,
			),
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
