import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const warbands = sqliteTable("warbands", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	faction: text("faction").notNull(),
	captain: text("captain").notNull(),
	rating: integer("rating").notNull().default(0),
	wins: integer("wins").notNull().default(0),
	status: text("status", {
		enum: ["Ready", "Recovering", "Recruiting"],
	})
		.notNull()
		.default("Recruiting"),
	createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type Warband = typeof warbands.$inferSelect;
export type NewWarband = typeof warbands.$inferInsert;
