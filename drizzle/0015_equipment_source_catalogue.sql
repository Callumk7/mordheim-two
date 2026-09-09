-- D1 keeps foreign keys enabled inside migrations. Back up assignments before
-- rebuilding their parent so DROP TABLE cannot cascade-delete those links.
CREATE TABLE `__equipment_assignment_backup` AS SELECT * FROM `warrior_equipment`;
--> statement-breakpoint
DROP TABLE `warrior_equipment`;
--> statement-breakpoint
CREATE TABLE `__new_equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cost` text,
	`availability` text,
	`range` text,
	`strength` text,
	`special_rules` text NOT NULL,
	`type` text NOT NULL,
	`save` text,
	`source_url` text,
	`source_text` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "equipment_type_valid" CHECK("__new_equipment"."type" IN ('weapon', 'armour'))
);
--> statement-breakpoint
-- Preserve legacy numbers as text without guessing missing units, dice or qualifiers.
INSERT INTO `__new_equipment` ("id", "name", "cost", "availability", "range", "strength", "special_rules", "type", "save", "source_url", "source_text", "notes", "created_at", "updated_at")
SELECT "id", "name", CAST("cost" AS TEXT), "availability", "range", "strength", "special_rules", "type", "save", NULL, NULL, 'Legacy numeric cost; original price expression and qualifications were not recorded.', "created_at", "updated_at" FROM `equipment`;
--> statement-breakpoint
DROP TABLE `equipment`;--> statement-breakpoint
ALTER TABLE `__new_equipment` RENAME TO `equipment`;--> statement-breakpoint
CREATE TABLE `warrior_equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`warrior_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`warrior_id`) REFERENCES `warriors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `warrior_equipment` ("id", "warrior_id", "equipment_id", "created_at", "updated_at")
SELECT "id", "warrior_id", "equipment_id", "created_at", "updated_at" FROM `__equipment_assignment_backup`;
--> statement-breakpoint
DROP TABLE `__equipment_assignment_backup`;
--> statement-breakpoint
CREATE INDEX `warrior_equipment_warrior_idx` ON `warrior_equipment` (`warrior_id`);
--> statement-breakpoint
CREATE INDEX `warrior_equipment_equipment_idx` ON `warrior_equipment` (`equipment_id`);