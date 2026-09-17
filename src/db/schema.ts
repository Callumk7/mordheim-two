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
import { EQUIPMENT_TYPES } from "./validation/equipment";
import { EVENT_OUTCOMES } from "./validation/event";
import {
	GEMINI_IMAGE_MODEL,
	IMAGE_GENERATION_MODELS,
} from "./validation/image-generation";
import { MATCH_RESULTS, MATCH_STATUSES } from "./validation/match";
import { WARRIOR_STATUSES } from "./validation/warrior";

export const appSettings = sqliteTable("app_settings", {
	key: text("key").primaryKey(),
	value: text("value").notNull(),
	updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const campaigns = sqliteTable("campaigns", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const imageGenerationJobs = sqliteTable(
	"image_generation_jobs",
	{
		id: text("id").primaryKey(),
		prompt: text("prompt").notNull(),
		refinedPrompt: text("refined_prompt"),
		model: text("model", { enum: IMAGE_GENERATION_MODELS })
			.notNull()
			.default(GEMINI_IMAGE_MODEL),
		warriorId: text("warrior_id").references(
			(): AnySQLiteColumn => warriors.id,
			{ onDelete: "set null" },
		),
		eventId: text("event_id").references((): AnySQLiteColumn => events.id, {
			onDelete: "set null",
		}),
		matchId: text("match_id").references((): AnySQLiteColumn => matches.id, {
			onDelete: "set null",
		}),
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
	},
	(table) => [
		index("image_generation_jobs_status_completed_at_idx").on(
			table.status,
			table.completedAt,
		),
		index("image_generation_jobs_warrior_id_idx").on(table.warriorId),
		index("image_generation_jobs_event_id_idx").on(table.eventId),
		index("image_generation_jobs_match_id_idx").on(table.matchId),
	],
);

export const warbands = sqliteTable(
	"warbands",
	{
		id: text("id").primaryKey(),
		campaignId: text("campaign_id")
			.notNull()
			.references(() => campaigns.id, { onDelete: "restrict" }),
		name: text("name").notNull(),
		faction: text("faction").notNull(),
		bio: text("bio"),
		gold: integer("gold").notNull().default(0),
		rating: integer("rating").notNull().default(0),
		wins: integer("wins").notNull().default(0),
		isArchived: integer("is_archived", { mode: "boolean" })
			.notNull()
			.default(false),
		archivedAt: text("archived_at"),
		createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
		updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [
		uniqueIndex("warbands_campaign_id_unique").on(table.campaignId, table.id),
		index("warbands_campaign_idx").on(table.campaignId),
		check(
			"warbands_archive_pair_consistent",
			sql`(${table.isArchived} = 0 AND ${table.archivedAt} IS NULL) OR (${table.isArchived} = 1 AND ${table.archivedAt} IS NOT NULL)`,
		),
	],
);

export const warriors = sqliteTable(
	"warriors",
	{
		id: text("id").primaryKey(),
		campaignId: text("campaign_id")
			.notNull()
			.references(() => campaigns.id, { onDelete: "restrict" }),
		name: text("name").notNull(),
		class: text("class").notNull(),
		description: text("description"),
		status: text("status", { enum: WARRIOR_STATUSES })
			.notNull()
			.default("Alive"),
		warbandId: text("warband_id")
			.notNull()
			.references(() => warbands.id, { onDelete: "cascade" }),
		activeImageJobId: text("active_image_job_id").references(
			() => imageGenerationJobs.id,
			{ onDelete: "set null" },
		),
		experience: integer("experience").notNull().default(0),
		knocked: integer("knocked").notNull().default(0),
		injuries: integer("injuries").notNull().default(0), // TODO: add an injury table
		knockedDowns: integer("knocked_downs").notNull().default(0),
		isArchived: integer("is_archived", { mode: "boolean" })
			.notNull()
			.default(false),
		archivedAt: text("archived_at"),
		createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
		updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [
		uniqueIndex("warriors_warband_id_unique").on(table.warbandId, table.id),
		uniqueIndex("warriors_campaign_id_unique").on(table.campaignId, table.id),
		index("warriors_campaign_idx").on(table.campaignId),
		index("warriors_active_image_job_idx").on(table.activeImageJobId),
		foreignKey({
			name: "warriors_campaign_warband_fk",
			columns: [table.campaignId, table.warbandId],
			foreignColumns: [warbands.campaignId, warbands.id],
		}),
		check(
			"warriors_archive_pair_consistent",
			sql`(${table.isArchived} = 0 AND ${table.archivedAt} IS NULL) OR (${table.isArchived} = 1 AND ${table.archivedAt} IS NOT NULL)`,
		),
	],
);

export const equipment = sqliteTable(
	"equipment",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		cost: text("cost"),
		availability: text("availability"),
		range: text("range"),
		strength: text("strength"),
		specialRules: text("special_rules", { mode: "json" })
			.$type<string[]>()
			.notNull(),
		type: text("type", { enum: EQUIPMENT_TYPES }).notNull(),
		save: text("save"),
		sourceUrl: text("source_url"),
		sourceText: text("source_text"),
		notes: text("notes"),
		createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
		updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [
		check("equipment_type_valid", sql`${table.type} IN ('weapon', 'armour')`),
	],
);

export const skills = sqliteTable(
	"skills",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		description: text("description").notNull(),
		createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
		updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [uniqueIndex("skills_name_unique").on(table.name)],
);

export const warriorSkills = sqliteTable(
	"warrior_skills",
	{
		id: text("id").primaryKey(),
		warriorId: text("warrior_id")
			.notNull()
			.references(() => warriors.id, { onDelete: "cascade" }),
		skillId: text("skill_id")
			.notNull()
			.references(() => skills.id, { onDelete: "cascade" }),
		createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
		updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [
		uniqueIndex("warrior_skills_warrior_skill_unique").on(
			table.warriorId,
			table.skillId,
		),
		index("warrior_skills_warrior_idx").on(table.warriorId),
		index("warrior_skills_skill_idx").on(table.skillId),
	],
);

export const warriorEquipment = sqliteTable(
	"warrior_equipment",
	{
		id: text("id").primaryKey(),
		warriorId: text("warrior_id")
			.notNull()
			.references(() => warriors.id, { onDelete: "cascade" }),
		equipmentId: text("equipment_id")
			.notNull()
			.references(() => equipment.id, { onDelete: "cascade" }),
		createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
		updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [
		index("warrior_equipment_warrior_idx").on(table.warriorId),
		index("warrior_equipment_equipment_idx").on(table.equipmentId),
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
		campaignId: text("campaign_id")
			.notNull()
			.references(() => campaigns.id, { onDelete: "restrict" }),
		name: text("name").notNull(),
		scenario: text("scenario").notNull(),
		status: text("status", { enum: MATCH_STATUSES })
			.notNull()
			.default("Scheduled"),
		result: text("result", { enum: MATCH_RESULTS })
			.notNull()
			.default("Pending"),
		winnerWarbandId: text("winner_warband_id"),
		activeImageJobId: text("active_image_job_id").references(
			() => imageGenerationJobs.id,
			{ onDelete: "set null" },
		),
		createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
		updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [
		uniqueIndex("matches_campaign_id_unique").on(table.campaignId, table.id),
		index("matches_campaign_idx").on(table.campaignId),
		index("matches_active_image_job_idx").on(table.activeImageJobId),
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
		campaignId: text("campaign_id")
			.notNull()
			.references(() => campaigns.id, { onDelete: "restrict" }),
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
		activeImageJobId: text("active_image_job_id").references(
			() => imageGenerationJobs.id,
			{ onDelete: "set null" },
		),
		createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
		updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [
		check(
			"events_distinct_warbands",
			sql`${table.attackerWarbandId} <> ${table.defenderWarbandId}`,
		),
		foreignKey({
			name: "events_campaign_match_fk",
			columns: [table.campaignId, table.matchId],
			foreignColumns: [matches.campaignId, matches.id],
		}),
		foreignKey({
			name: "events_campaign_attacker_warband_fk",
			columns: [table.campaignId, table.attackerWarbandId],
			foreignColumns: [warbands.campaignId, warbands.id],
		}),
		foreignKey({
			name: "events_campaign_defender_warband_fk",
			columns: [table.campaignId, table.defenderWarbandId],
			foreignColumns: [warbands.campaignId, warbands.id],
		}),
		foreignKey({
			name: "events_campaign_attacker_warrior_fk",
			columns: [table.campaignId, table.attackerWarriorId],
			foreignColumns: [warriors.campaignId, warriors.id],
		}),
		foreignKey({
			name: "events_campaign_defender_warrior_fk",
			columns: [table.campaignId, table.defenderWarriorId],
			foreignColumns: [warriors.campaignId, warriors.id],
		}),
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
		index("events_campaign_idx").on(table.campaignId),
		index("events_active_image_job_idx").on(table.activeImageJobId),
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

export const campaignsRelations = relations(campaigns, ({ many }) => ({
	warbands: many(warbands),
	warriors: many(warriors),
	matches: many(matches),
	events: many(events),
}));

export const warbandsRelations = relations(warbands, ({ many, one }) => ({
	campaign: one(campaigns, {
		fields: [warbands.campaignId],
		references: [campaigns.id],
	}),
	warriors: many(warriors),
	warbandMatches: many(warbandMatches),
	attackingEvents: many(events, { relationName: "attackerWarband" }),
	defendingEvents: many(events, { relationName: "defenderWarband" }),
}));

export const warriorsRelations = relations(warriors, ({ many, one }) => ({
	campaign: one(campaigns, {
		fields: [warriors.campaignId],
		references: [campaigns.id],
	}),
	warband: one(warbands, {
		fields: [warriors.warbandId],
		references: [warbands.id],
	}),
	equipment: many(warriorEquipment),
	skills: many(warriorSkills),
}));

export const skillsRelations = relations(skills, ({ many }) => ({
	warriors: many(warriorSkills),
}));

export const warriorSkillsRelations = relations(warriorSkills, ({ one }) => ({
	warrior: one(warriors, {
		fields: [warriorSkills.warriorId],
		references: [warriors.id],
	}),
	skill: one(skills, {
		fields: [warriorSkills.skillId],
		references: [skills.id],
	}),
}));

export const equipmentRelations = relations(equipment, ({ many }) => ({
	warriors: many(warriorEquipment),
}));

export const warriorEquipmentRelations = relations(
	warriorEquipment,
	({ one }) => ({
		warrior: one(warriors, {
			fields: [warriorEquipment.warriorId],
			references: [warriors.id],
		}),
		equipment: one(equipment, {
			fields: [warriorEquipment.equipmentId],
			references: [equipment.id],
		}),
	}),
);

export const matchesRelations = relations(matches, ({ many, one }) => ({
	campaign: one(campaigns, {
		fields: [matches.campaignId],
		references: [campaigns.id],
	}),
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
	campaign: one(campaigns, {
		fields: [events.campaignId],
		references: [campaigns.id],
	}),
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
