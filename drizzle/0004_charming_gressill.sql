CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`attacker_warband_id` text NOT NULL,
	`defender_warband_id` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attacker_warband_id`) REFERENCES `warbands`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`defender_warband_id`) REFERENCES `warbands`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "events_distinct_warbands" CHECK("events"."attacker_warband_id" <> "events"."defender_warband_id")
);
