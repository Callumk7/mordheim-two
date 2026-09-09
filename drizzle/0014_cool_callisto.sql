CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cost` real NOT NULL,
	`availability` text NOT NULL,
	`range` text NOT NULL,
	`strength` text NOT NULL,
	`special_rules` text NOT NULL,
	`type` text NOT NULL,
	`save` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "equipment_type_valid" CHECK("equipment"."type" IN ('weapon', 'armour'))
);
--> statement-breakpoint
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
CREATE INDEX `warrior_equipment_warrior_idx` ON `warrior_equipment` (`warrior_id`);--> statement-breakpoint
CREATE INDEX `warrior_equipment_equipment_idx` ON `warrior_equipment` (`equipment_id`);