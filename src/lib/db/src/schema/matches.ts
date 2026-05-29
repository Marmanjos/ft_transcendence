import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  player1Id: integer("player1_id").notNull().references(() => usersTable.id),
  player2Id: integer("player2_id").references(() => usersTable.id),
  mode: text("mode").notNull().default("SINGLE_PLAYER"), // SINGLE_PLAYER | MULTIPLAYER
  status: text("status").notNull().default("ACTIVE"), // ACTIVE | COMPLETED | ABANDONED
  winnerId: integer("winner_id").references(() => usersTable.id),
  player1Score: integer("player1_score").notNull().default(0),
  player2Score: integer("player2_score").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;
