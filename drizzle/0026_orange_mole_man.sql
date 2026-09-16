DROP INDEX `image_generation_jobs_warrior_id_unique`;--> statement-breakpoint
DROP INDEX `image_generation_jobs_event_id_unique`;--> statement-breakpoint
DROP INDEX `image_generation_jobs_match_id_unique`;--> statement-breakpoint
CREATE INDEX `image_generation_jobs_warrior_id_idx` ON `image_generation_jobs` (`warrior_id`);--> statement-breakpoint
CREATE INDEX `image_generation_jobs_event_id_idx` ON `image_generation_jobs` (`event_id`);--> statement-breakpoint
CREATE INDEX `image_generation_jobs_match_id_idx` ON `image_generation_jobs` (`match_id`);--> statement-breakpoint
ALTER TABLE `events` ADD `active_image_job_id` text REFERENCES image_generation_jobs(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `events_active_image_job_idx` ON `events` (`active_image_job_id`);--> statement-breakpoint
ALTER TABLE `matches` ADD `active_image_job_id` text REFERENCES image_generation_jobs(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `matches_active_image_job_idx` ON `matches` (`active_image_job_id`);--> statement-breakpoint
ALTER TABLE `warriors` ADD `active_image_job_id` text REFERENCES image_generation_jobs(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `warriors_active_image_job_idx` ON `warriors` (`active_image_job_id`);--> statement-breakpoint
CREATE TRIGGER `warriors_active_image_job_valid_insert`
BEFORE INSERT ON `warriors`
WHEN NEW.`active_image_job_id` IS NOT NULL AND NOT EXISTS (
	SELECT 1 FROM `image_generation_jobs`
	WHERE `id` = NEW.`active_image_job_id`
		AND `status` = 'completed'
		AND `warrior_id` = NEW.`id`
)
BEGIN SELECT RAISE(ABORT, 'active warrior image must be a completed associated job'); END;--> statement-breakpoint
CREATE TRIGGER `warriors_active_image_job_valid_update`
BEFORE UPDATE OF `active_image_job_id` ON `warriors`
WHEN NEW.`active_image_job_id` IS NOT NULL AND NOT EXISTS (
	SELECT 1 FROM `image_generation_jobs`
	WHERE `id` = NEW.`active_image_job_id`
		AND `status` = 'completed'
		AND `warrior_id` = NEW.`id`
)
BEGIN SELECT RAISE(ABORT, 'active warrior image must be a completed associated job'); END;--> statement-breakpoint
CREATE TRIGGER `events_active_image_job_valid_insert`
BEFORE INSERT ON `events`
WHEN NEW.`active_image_job_id` IS NOT NULL AND NOT EXISTS (
	SELECT 1 FROM `image_generation_jobs`
	WHERE `id` = NEW.`active_image_job_id`
		AND `status` = 'completed'
		AND `event_id` = NEW.`id`
)
BEGIN SELECT RAISE(ABORT, 'active event image must be a completed associated job'); END;--> statement-breakpoint
CREATE TRIGGER `events_active_image_job_valid_update`
BEFORE UPDATE OF `active_image_job_id` ON `events`
WHEN NEW.`active_image_job_id` IS NOT NULL AND NOT EXISTS (
	SELECT 1 FROM `image_generation_jobs`
	WHERE `id` = NEW.`active_image_job_id`
		AND `status` = 'completed'
		AND `event_id` = NEW.`id`
)
BEGIN SELECT RAISE(ABORT, 'active event image must be a completed associated job'); END;--> statement-breakpoint
CREATE TRIGGER `matches_active_image_job_valid_insert`
BEFORE INSERT ON `matches`
WHEN NEW.`active_image_job_id` IS NOT NULL AND NOT EXISTS (
	SELECT 1 FROM `image_generation_jobs`
	WHERE `id` = NEW.`active_image_job_id`
		AND `status` = 'completed'
		AND `match_id` = NEW.`id`
)
BEGIN SELECT RAISE(ABORT, 'active match image must be a completed associated job'); END;--> statement-breakpoint
CREATE TRIGGER `matches_active_image_job_valid_update`
BEFORE UPDATE OF `active_image_job_id` ON `matches`
WHEN NEW.`active_image_job_id` IS NOT NULL AND NOT EXISTS (
	SELECT 1 FROM `image_generation_jobs`
	WHERE `id` = NEW.`active_image_job_id`
		AND `status` = 'completed'
		AND `match_id` = NEW.`id`
)
BEGIN SELECT RAISE(ABORT, 'active match image must be a completed associated job'); END;--> statement-breakpoint
CREATE TRIGGER `image_generation_jobs_auto_activate`
AFTER UPDATE OF `status` ON `image_generation_jobs`
WHEN NEW.`status` = 'completed' AND OLD.`status` <> 'completed'
BEGIN
	UPDATE `warriors` SET `active_image_job_id` = NEW.`id`
	WHERE `id` = NEW.`warrior_id` AND `active_image_job_id` IS NULL;
	UPDATE `events` SET `active_image_job_id` = NEW.`id`
	WHERE `id` = NEW.`event_id` AND `active_image_job_id` IS NULL;
	UPDATE `matches` SET `active_image_job_id` = NEW.`id`
	WHERE `id` = NEW.`match_id` AND `active_image_job_id` IS NULL;
END;--> statement-breakpoint
CREATE TRIGGER `image_generation_jobs_clear_inactive_pointer`
AFTER UPDATE OF `status` ON `image_generation_jobs`
WHEN OLD.`status` = 'completed' AND NEW.`status` <> 'completed'
BEGIN
	UPDATE `warriors` SET `active_image_job_id` = NULL WHERE `active_image_job_id` = NEW.`id`;
	UPDATE `events` SET `active_image_job_id` = NULL WHERE `active_image_job_id` = NEW.`id`;
	UPDATE `matches` SET `active_image_job_id` = NULL WHERE `active_image_job_id` = NEW.`id`;
END;