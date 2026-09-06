ALTER TABLE `events` ADD `is_processed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `outcome` text;