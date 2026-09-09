ALTER TABLE `image_generation_jobs` ADD `lease_token` text;--> statement-breakpoint
ALTER TABLE `image_generation_jobs` ADD `lease_expires_at` integer;--> statement-breakpoint
ALTER TABLE `image_generation_jobs` ADD `result_key` text;--> statement-breakpoint
ALTER TABLE `image_generation_jobs` ADD `result_mime_type` text;--> statement-breakpoint
ALTER TABLE `image_generation_jobs` ADD `result_bytes` integer;--> statement-breakpoint
ALTER TABLE `image_generation_jobs` ADD `result_etag` text;--> statement-breakpoint
ALTER TABLE `image_generation_jobs` ADD `result_model` text;--> statement-breakpoint
ALTER TABLE `image_generation_jobs` ADD `completed_at` text;