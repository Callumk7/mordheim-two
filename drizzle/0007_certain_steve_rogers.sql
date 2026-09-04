PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE `events`;--> statement-breakpoint
CREATE UNIQUE INDEX `warband_matches_match_warband_unique` ON `warband_matches` (`match_id`,`warband_id`);--> statement-breakpoint
CREATE INDEX `warband_matches_warband_idx` ON `warband_matches` (`warband_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `warriors_warband_id_unique` ON `warriors` (`warband_id`,`id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`attacker_warband_id` text NOT NULL,
	`attacker_warrior_id` text NOT NULL,
	`defender_warband_id` text NOT NULL,
	`defender_warrior_id` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attacker_warband_id`) REFERENCES `warbands`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attacker_warrior_id`) REFERENCES `warriors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`defender_warband_id`) REFERENCES `warbands`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`defender_warrior_id`) REFERENCES `warriors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`match_id`,`attacker_warband_id`) REFERENCES `warband_matches`(`match_id`,`warband_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`match_id`,`defender_warband_id`) REFERENCES `warband_matches`(`match_id`,`warband_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attacker_warband_id`,`attacker_warrior_id`) REFERENCES `warriors`(`warband_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`defender_warband_id`,`defender_warrior_id`) REFERENCES `warriors`(`warband_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "events_distinct_warbands" CHECK("events"."attacker_warband_id" <> "events"."defender_warband_id")
);--> statement-breakpoint
PRAGMA foreign_keys=ON;
