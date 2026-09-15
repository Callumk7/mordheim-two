ALTER TABLE `warbands` ADD `archived_at` text;--> statement-breakpoint
ALTER TABLE `warbands` ADD `is_archived` integer DEFAULT 0 NOT NULL CONSTRAINT "warbands_archive_pair_consistent" CHECK((`is_archived` = 0 AND `archived_at` IS NULL) OR (`is_archived` = 1 AND `archived_at` IS NOT NULL));--> statement-breakpoint
ALTER TABLE `warriors` ADD `archived_at` text;--> statement-breakpoint
ALTER TABLE `warriors` ADD `is_archived` integer DEFAULT 0 NOT NULL CONSTRAINT "warriors_archive_pair_consistent" CHECK((`is_archived` = 0 AND `archived_at` IS NULL) OR (`is_archived` = 1 AND `archived_at` IS NOT NULL));
