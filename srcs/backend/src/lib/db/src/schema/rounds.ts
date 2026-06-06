import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { matchesTable } from "./matches";

export const roundsTable = pgTable("rounds", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matchesTable.id),
  roundNumber: integer("round_number").notNull(),
  player1Choice: text("player1_choice").notNull(), // TITAN | RAZOR | WRAITH
  player2Choice: text("player2_choice").notNull(), // TITAN | RAZOR | WRAITH
  outcome: text("outcome").notNull(), // WIN | LOSS | DRAW
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRoundSchema = createInsertSchema(roundsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertRound = z.infer<typeof insertRoundSchema>;
export type Round = typeof roundsTable.$inferSelect;
