ALTER TABLE `warbands` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `warbands` ADD `gold` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `warbands` DROP COLUMN `captain`;--> statement-breakpoint
ALTER TABLE `warbands` DROP COLUMN `status`;