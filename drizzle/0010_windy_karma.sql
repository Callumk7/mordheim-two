PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`scenario` text NOT NULL,
	`status` text DEFAULT 'Scheduled' NOT NULL,
	`result` text DEFAULT 'Pending' NOT NULL,
	`winner_warband_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`id`,`winner_warband_id`) REFERENCES `warband_matches`(`match_id`,`warband_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "matches_result_winner_consistent" CHECK(("result" = 'Pending' AND "winner_warband_id" IS NULL) OR ("result" = 'Draw' AND "winner_warband_id" IS NULL) OR ("result" = 'Victory' AND "winner_warband_id" IS NOT NULL))
);
--> statement-breakpoint
INSERT INTO `__new_matches`("id", "name", "scenario", "status", "result", "winner_warband_id", "created_at", "updated_at") SELECT "id", "name", "scenario", "status", 'Pending', NULL, "created_at", "updated_at" FROM `matches`;--> statement-breakpoint
DROP TABLE `matches`;--> statement-breakpoint
ALTER TABLE `__new_matches` RENAME TO `matches`;--> statement-breakpoint
PRAGMA foreign_keys=ON;