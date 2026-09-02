PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_warband_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`warband_id` text NOT NULL,
	`match_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`warband_id`) REFERENCES `warbands`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_warband_matches`("id", "warband_id", "match_id", "created_at", "updated_at") SELECT "id", "warband_id", "match_id", "created_at", "updated_at" FROM `warband_matches`;--> statement-breakpoint
DROP TABLE `warband_matches`;--> statement-breakpoint
ALTER TABLE `__new_warband_matches` RENAME TO `warband_matches`;--> statement-breakpoint
PRAGMA foreign_keys=ON;