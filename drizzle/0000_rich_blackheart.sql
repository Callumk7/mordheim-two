CREATE TABLE `warbands` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`faction` text NOT NULL,
	`captain` text NOT NULL,
	`rating` integer DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Recruiting' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
