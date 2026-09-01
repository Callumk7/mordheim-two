CREATE TABLE `warriors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`class` text NOT NULL,
	`status` text DEFAULT 'Alive' NOT NULL,
	`warband_id` text NOT NULL,
	`knocked` integer DEFAULT 0 NOT NULL,
	`injuries` integer DEFAULT 0 NOT NULL,
	`knocked_downs` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`warband_id`) REFERENCES `warbands`(`id`) ON UPDATE no action ON DELETE cascade
);
