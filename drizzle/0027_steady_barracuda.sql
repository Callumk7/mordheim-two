CREATE TABLE `skills` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skills_name_unique` ON `skills` (`name`);--> statement-breakpoint
CREATE TABLE `warrior_skills` (
	`id` text PRIMARY KEY NOT NULL,
	`warrior_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`warrior_id`) REFERENCES `warriors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warrior_skills_warrior_skill_unique` ON `warrior_skills` (`warrior_id`,`skill_id`);--> statement-breakpoint
CREATE INDEX `warrior_skills_warrior_idx` ON `warrior_skills` (`warrior_id`);--> statement-breakpoint
CREATE INDEX `warrior_skills_skill_idx` ON `warrior_skills` (`skill_id`);--> statement-breakpoint
ALTER TABLE `warriors` ADD `experience` integer DEFAULT 0 NOT NULL;