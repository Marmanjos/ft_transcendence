import { pgTable, text, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const friendshipsTable = pgTable("friendships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  friendId: integer("friend_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("PENDING"), // 'PENDING' | 'ACCEPTED'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("uid_fid_unique").on(t.userId, t.friendId)
]);
