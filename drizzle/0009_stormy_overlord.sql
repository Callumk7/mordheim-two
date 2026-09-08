PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_events` (
	`id` text PRIMARY KEY NOT NULL,
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
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`attacker_warband_id`) REFERENCES `warbands`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`attacker_warrior_id`) REFERENCES `warriors`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`defender_warband_id`) REFERENCES `warbands`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`defender_warrior_id`) REFERENCES `warriors`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`match_id`,`attacker_warband_id`) REFERENCES `warband_matches`(`match_id`,`warband_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`match_id`,`defender_warband_id`) REFERENCES `warband_matches`(`match_id`,`warband_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attacker_warband_id`,`attacker_warrior_id`) REFERENCES `warriors`(`warband_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`defender_warband_id`,`defender_warrior_id`) REFERENCES `warriors`(`warband_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "events_distinct_warbands" CHECK("__new_events"."attacker_warband_id" <> "__new_events"."defender_warband_id")
);
--> statement-breakpoint
INSERT INTO `__new_events`("id", "match_id", "attacker_warband_id", "attacker_warrior_id", "defender_warband_id", "defender_warrior_id", "notes", "is_processed", "outcome", "resolved_at", "voided_at", "void_reason", "created_at", "updated_at") SELECT "id", "match_id", "attacker_warband_id", "attacker_warrior_id", "defender_warband_id", "defender_warrior_id", "notes", "is_processed", "outcome", CASE WHEN "is_processed" = 1 AND "outcome" IS NOT NULL THEN COALESCE("updated_at", "created_at", CURRENT_TIMESTAMP) ELSE NULL END, NULL, NULL, "created_at", "updated_at" FROM `events`;--> statement-breakpoint
UPDATE `__new_events` AS `event` SET `voided_at` = COALESCE(`resolved_at`, `updated_at`, `created_at`, CURRENT_TIMESTAMP), `void_reason` = 'Migration: duplicate historical death superseded' WHERE `outcome` = 'Death' AND `voided_at` IS NULL AND EXISTS (SELECT 1 FROM `__new_events` AS `newer` WHERE `newer`.`defender_warrior_id` = `event`.`defender_warrior_id` AND `newer`.`outcome` = 'Death' AND `newer`.`voided_at` IS NULL AND (COALESCE(`newer`.`resolved_at`, `newer`.`updated_at`, `newer`.`created_at`) > COALESCE(`event`.`resolved_at`, `event`.`updated_at`, `event`.`created_at`) OR (COALESCE(`newer`.`resolved_at`, `newer`.`updated_at`, `newer`.`created_at`) = COALESCE(`event`.`resolved_at`, `event`.`updated_at`, `event`.`created_at`) AND `newer`.`id` > `event`.`id`)));--> statement-breakpoint
DROP TABLE `events`;--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `events_match_idx` ON `events` (`match_id`);--> statement-breakpoint
CREATE INDEX `events_attacker_warrior_idx` ON `events` (`attacker_warrior_id`);--> statement-breakpoint
CREATE INDEX `events_defender_warrior_idx` ON `events` (`defender_warrior_id`);--> statement-breakpoint
CREATE INDEX `events_attacker_warband_idx` ON `events` (`attacker_warband_id`);--> statement-breakpoint
CREATE INDEX `events_defender_warband_idx` ON `events` (`defender_warband_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_effective_death_defender_unique` ON `events` (`defender_warrior_id`) WHERE "events"."outcome" = 'Death' AND "events"."resolved_at" IS NOT NULL AND "events"."voided_at" IS NULL;