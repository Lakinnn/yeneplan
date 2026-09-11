import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  checkIns,
  coachMessages,
  InsertUser,
  plans,
  profiles,
  users,
  visions,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { nanoid } from "nanoid";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getOrCreateProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(profiles).values({ userId, displayName: null, focus: null });
  const created = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!created[0]) throw new Error("Could not create profile");
  return created[0];
}

export async function getDashboardData(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const profile = await getOrCreateProfile(userId);
  const [userVisions, userPlans, recentCheckIns, recentMessages] = await Promise.all([
    db.select().from(visions).where(eq(visions.userId, userId)).orderBy(desc(visions.createdAt)),
    db.select().from(plans).where(eq(plans.userId, userId)).orderBy(desc(plans.createdAt)).limit(100),
    db.select().from(checkIns).where(eq(checkIns.userId, userId)).orderBy(desc(checkIns.createdAt)).limit(30),
    db.select().from(coachMessages).where(eq(coachMessages.userId, userId)).orderBy(desc(coachMessages.createdAt)).limit(20),
  ]);
  return { profile, visions: userVisions, plans: userPlans, checkIns: recentCheckIns, coachMessages: recentMessages.reverse() };
}

export async function getUserPlanContext(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [profile, userVisions, userPlans, recentCheckIns] = await Promise.all([
    getOrCreateProfile(userId),
    db.select().from(visions).where(eq(visions.userId, userId)).orderBy(desc(visions.createdAt)),
    db.select().from(plans).where(eq(plans.userId, userId)).orderBy(desc(plans.createdAt)).limit(50),
    db.select().from(checkIns).where(eq(checkIns.userId, userId)).orderBy(desc(checkIns.createdAt)).limit(14),
  ]);
  return { profile, visions: userVisions, plans: userPlans, checkIns: recentCheckIns };
}

export async function updatePlanStatus(userId: number, planId: number, status: "backlog" | "active" | "done" | "missed") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(plans).set({ status, completedAt: status === "done" ? new Date() : null }).where(and(eq(plans.id, planId), eq(plans.userId, userId)));
}

export async function getTelegramLink(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const profile = await getOrCreateProfile(userId);
  if (profile.telegramLinkToken) return profile.telegramLinkToken;
  const token = nanoid(32);
  await db.update(profiles).set({ telegramLinkToken: token }).where(eq(profiles.userId, userId));
  return token;
}

export async function connectTelegramToken(token: string, chatId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const found = await db.select().from(profiles).where(eq(profiles.telegramLinkToken, token)).limit(1);
  if (!found[0]) return null;
  await db.update(profiles).set({ telegramChatId: chatId, telegramConnectedAt: new Date(), reminderEnabled: 1 }).where(eq(profiles.id, found[0].id));
  return found[0].userId;
}

export async function getReminderRecipients() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(profiles).where(and(eq(profiles.reminderEnabled, 1)));
}

export async function disconnectTelegram(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(profiles).set({ telegramChatId: null, telegramConnectedAt: null, reminderEnabled: 0 }).where(eq(profiles.userId, userId));
}

export async function getProfileByTelegramChatId(chatId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.select().from(profiles).where(eq(profiles.telegramChatId, chatId)).limit(1);
  return result[0] ?? null;
}

export async function getTelegramTodayPlans(chatId: string) {
  const profile = await getProfileByTelegramChatId(chatId);
  if (!profile) return { profile: null, plans: [] };
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const todayPlans = await db.select().from(plans).where(and(eq(plans.userId, profile.userId), eq(plans.period, "day"), eq(plans.ethiopianYear, profile.ethiopianYear), eq(plans.ethiopianMonth, profile.currentMonth), eq(plans.ethiopianDay, profile.currentDay))).orderBy(desc(plans.createdAt)).limit(20);
  return { profile, plans: todayPlans };
}

export async function createTelegramTask(chatId: string, title: string, priority: "low" | "medium" | "high" = "medium") {
  const profile = await getProfileByTelegramChatId(chatId);
  if (!profile) return null;
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(plans).values({ userId: profile.userId, period: "day", ethiopianYear: profile.ethiopianYear, ethiopianMonth: profile.currentMonth, ethiopianDay: profile.currentDay, title, detail: null, priority, status: "active" });
  const created = await db.select().from(plans).where(and(eq(plans.userId, profile.userId), eq(plans.period, "day"))).orderBy(desc(plans.createdAt)).limit(1);
  return created[0] ?? null;
}

export async function createTelegramProgress(chatId: string, note: string, status: "done" | "missed" | "rest" = "done") {
  const profile = await getProfileByTelegramChatId(chatId);
  if (!profile) return null;
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const ethiopianDate = `${profile.ethiopianYear}-${profile.currentMonth}-${profile.currentDay}`;
  await db.insert(checkIns).values({ userId: profile.userId, planId: null, ethiopianDate, mood: null, note, status });
  return { ethiopianDate };
}

export async function updateTelegramPlan(chatId: string, planId: number, status: "done" | "missed" | "active") {
  const profile = await getProfileByTelegramChatId(chatId);
  if (!profile) return null;
  await updatePlanStatus(profile.userId, planId, status);
  return profile;
}
