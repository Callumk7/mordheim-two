PRAGMA foreign_keys=OFF;--> statement-breakpoint
DELETE FROM `image_generation_jobs`;--> statement-breakpoint
DROP TABLE IF EXISTS `events`;--> statement-breakpoint
DROP TABLE IF EXISTS `warband_matches`;--> statement-breakpoint
DROP TABLE IF EXISTS `warrior_equipment`;--> statement-breakpoint
DROP TABLE IF EXISTS `warriors`;--> statement-breakpoint
DROP TABLE IF EXISTS `matches`;--> statement-breakpoint
DROP TABLE IF EXISTS `warbands`;--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
CREATE TABLE `warbands` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`name` text NOT NULL,
	`faction` text NOT NULL,
	`bio` text,
	`gold` integer DEFAULT 0 NOT NULL,
	`rating` integer DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`archived_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "warbands_archive_pair_consistent" CHECK(("warbands"."is_archived" = 0 AND "warbands"."archived_at" IS NULL) OR ("warbands"."is_archived" = 1 AND "warbands"."archived_at" IS NOT NULL))
);--> statement-breakpoint
CREATE UNIQUE INDEX `warbands_campaign_id_unique` ON `warbands` (`campaign_id`,`id`);--> statement-breakpoint
CREATE INDEX `warbands_campaign_idx` ON `warbands` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `warriors` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`name` text NOT NULL,
	`class` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'Alive' NOT NULL,
	`warband_id` text NOT NULL,
	`knocked` integer DEFAULT 0 NOT NULL,
	`injuries` integer DEFAULT 0 NOT NULL,
	`knocked_downs` integer DEFAULT 0 NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`archived_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`warband_id`) REFERENCES `warbands`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`campaign_id`,`warband_id`) REFERENCES `warbands`(`campaign_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "warriors_archive_pair_consistent" CHECK(("warriors"."is_archived" = 0 AND "warriors"."archived_at" IS NULL) OR ("warriors"."is_archived" = 1 AND "warriors"."archived_at" IS NOT NULL))
);--> statement-breakpoint
CREATE UNIQUE INDEX `warriors_warband_id_unique` ON `warriors` (`warband_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `warriors_campaign_id_unique` ON `warriors` (`campaign_id`,`id`);--> statement-breakpoint
CREATE INDEX `warriors_campaign_idx` ON `warriors` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`name` text NOT NULL,
	`scenario` text NOT NULL,
	`status` text DEFAULT 'Scheduled' NOT NULL,
	`result` text DEFAULT 'Pending' NOT NULL,
	`winner_warband_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "matches_result_winner_consistent" CHECK(("matches"."result" = 'Pending' AND "matches"."winner_warband_id" IS NULL) OR ("matches"."result" = 'Draw' AND "matches"."winner_warband_id" IS NULL) OR ("matches"."result" = 'Victory' AND "matches"."winner_warband_id" IS NOT NULL))
);--> statement-breakpoint
CREATE UNIQUE INDEX `matches_campaign_id_unique` ON `matches` (`campaign_id`,`id`);--> statement-breakpoint
CREATE INDEX `matches_campaign_idx` ON `matches` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `warband_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`warband_id` text NOT NULL,
	`match_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`warband_id`) REFERENCES `warbands`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `warband_matches_match_warband_unique` ON `warband_matches` (`match_id`,`warband_id`);--> statement-breakpoint
CREATE INDEX `warband_matches_warband_idx` ON `warband_matches` (`warband_id`);--> statement-breakpoint
CREATE TABLE `__new_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`name` text NOT NULL,
	`scenario` text NOT NULL,
	`status` text DEFAULT 'Scheduled' NOT NULL,
	`result` text DEFAULT 'Pending' NOT NULL,
	`winner_warband_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`id`,`winner_warband_id`) REFERENCES `warband_matches`(`match_id`,`warband_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "matches_result_winner_consistent" CHECK(("__new_matches"."result" = 'Pending' AND "__new_matches"."winner_warband_id" IS NULL) OR ("__new_matches"."result" = 'Draw' AND "__new_matches"."winner_warband_id" IS NULL) OR ("__new_matches"."result" = 'Victory' AND "__new_matches"."winner_warband_id" IS NOT NULL))
);--> statement-breakpoint
DROP TABLE `matches`;--> statement-breakpoint
ALTER TABLE `__new_matches` RENAME TO `matches`;--> statement-breakpoint
CREATE UNIQUE INDEX `matches_campaign_id_unique` ON `matches` (`campaign_id`,`id`);--> statement-breakpoint
CREATE INDEX `matches_campaign_idx` ON `matches` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `warrior_equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`warrior_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`warrior_id`) REFERENCES `warriors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `warrior_equipment_warrior_idx` ON `warrior_equipment` (`warrior_id`);--> statement-breakpoint
CREATE INDEX `warrior_equipment_equipment_idx` ON `warrior_equipment` (`equipment_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`match_id` text NOT NULL,
	`attacker_warband_id` text NOT NULL,
	`attacker_warrior_id` text NOT NULL,
	`defender_warband_id` text NOT NULL,
	`defender_warrior_id` text NOT NULL,
	`notes` text,
	`is_processed` integer DEFAULT false NOT NULL,
	`outcome` text,
	`resolved_at` text,
	`voided_at` text,
	`void_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`attacker_warband_id`) REFERENCES `warbands`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`attacker_warrior_id`) REFERENCES `warriors`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`defender_warband_id`) REFERENCES `warbands`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`defender_warrior_id`) REFERENCES `warriors`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`campaign_id`,`match_id`) REFERENCES `matches`(`campaign_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_id`,`attacker_warband_id`) REFERENCES `warbands`(`campaign_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_id`,`defender_warband_id`) REFERENCES `warbands`(`campaign_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_id`,`attacker_warrior_id`) REFERENCES `warriors`(`campaign_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_id`,`defender_warrior_id`) REFERENCES `warriors`(`campaign_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`match_id`,`attacker_warband_id`) REFERENCES `warband_matches`(`match_id`,`warband_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`match_id`,`defender_warband_id`) REFERENCES `warband_matches`(`match_id`,`warband_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attacker_warband_id`,`attacker_warrior_id`) REFERENCES `warriors`(`warband_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`defender_warband_id`,`defender_warrior_id`) REFERENCES `warriors`(`warband_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "events_distinct_warbands" CHECK("events"."attacker_warband_id" <> "events"."defender_warband_id")
);--> statement-breakpoint
CREATE INDEX `events_campaign_idx` ON `events` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `events_match_idx` ON `events` (`match_id`);--> statement-breakpoint
CREATE INDEX `events_attacker_warrior_idx` ON `events` (`attacker_warrior_id`);--> statement-breakpoint
CREATE INDEX `events_defender_warrior_idx` ON `events` (`defender_warrior_id`);--> statement-breakpoint
CREATE INDEX `events_attacker_warband_idx` ON `events` (`attacker_warband_id`);--> statement-breakpoint
CREATE INDEX `events_defender_warband_idx` ON `events` (`defender_warband_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_effective_death_defender_unique` ON `events` (`defender_warrior_id`) WHERE "events"."outcome" = 'Death' AND "events"."resolved_at" IS NOT NULL AND "events"."voided_at" IS NULL;--> statement-breakpoint
PRAGMA foreign_keys=ON;
