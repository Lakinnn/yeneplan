import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  displayName: varchar("displayName", { length: 120 }),
  ethiopianYear: int("ethiopianYear").default(2019).notNull(),
  currentMonth: int("currentMonth").default(1).notNull(),
  currentDay: int("currentDay").default(1).notNull(),
  focus: text("focus"),
  timezone: varchar("timezone", { length: 80 }).default("Africa/Addis_Ababa").notNull(),
  coachTone: mysqlEnum("coachTone", ["warm", "direct", "chaotic"]).default("warm").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const visions = mysqlTable("visions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  reason: text("reason"),
  category: varchar("category", { length: 80 }).default("life").notNull(),
  emoji: varchar("emoji", { length: 8 }).default("✦").notNull(),
  color: varchar("color", { length: 24 }).default("sun").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const plans = mysqlTable("plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  period: mysqlEnum("period", ["year", "month", "day"]).notNull(),
  ethiopianYear: int("ethiopianYear").notNull(),
  ethiopianMonth: int("ethiopianMonth"),
  ethiopianDay: int("ethiopianDay"),
  title: varchar("title", { length: 180 }).notNull(),
  detail: text("detail"),
  status: mysqlEnum("status", ["backlog", "active", "done", "missed"]).default("backlog").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export const checkIns = mysqlTable("checkIns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  planId: int("planId"),
  ethiopianDate: varchar("ethiopianDate", { length: 32 }).notNull(),
  mood: int("mood"),
  note: text("note"),
  status: mysqlEnum("status", ["done", "missed", "rest"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const coachMessages = mysqlTable("coachMessages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type Vision = typeof visions.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type CheckIn = typeof checkIns.$inferSelect;
export type CoachMessage = typeof coachMessages.$inferSelect;
