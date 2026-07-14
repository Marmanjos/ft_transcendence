import { pgTable, text, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Catálogo fixo de conquistas existentes no jogo.
// "key" é o identificador estável usado pelo código (ex.: "FIRST_WIN"),
// independente do "id" numérico gerado pelo banco.
export const achievementsTable = pgTable("achievements", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // ex: "FIRST_WIN", "FLAWLESS_VICTORY"
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon"), // nome/slug do ícone, opcional
  category: text("category").notNull().default("GENERAL"), // GENERAL | COMBAT | PROGRESSION
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Registro de quais achievements cada usuário já desbloqueou e quando.
export const userAchievementsTable = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  achievementId: integer("achievement_id").notNull().references(() => achievementsTable.id, { onDelete: "cascade" }),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("user_achievement_unique").on(t.userId, t.achievementId),
]);

export type Achievement = typeof achievementsTable.$inferSelect;
export type UserAchievement = typeof userAchievementsTable.$inferSelect;
