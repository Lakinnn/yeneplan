import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { getDb, getDashboardData, getOrCreateProfile, getUserPlanContext, updatePlanStatus, getTelegramLink, disconnectTelegram } from "./db";
import { checkIns, coachMessages, plans, profiles, visions } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "./storage";
import { getTelegramConnectUrl, telegramConfigured } from "./telegram";

const profileInput = z.object({
  displayName: z.string().max(120).optional().nullable(),
  ethiopianYear: z.number().int().min(1900).max(2200).optional(),
  currentMonth: z.number().int().min(1).max(13).optional(),
  currentDay: z.number().int().min(1).max(30).optional(),
  focus: z.string().max(1000).optional().nullable(),
  timezone: z.string().max(80).optional(),
  coachTone: z.enum(["warm", "direct", "chaotic"]).optional(),
  theme: z.enum(["light", "dark"]).optional(),
  reminderEnabled: z.number().int().min(0).max(1).optional(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
});

const periodInput = z.object({
  period: z.enum(["year", "month", "day"]),
  ethiopianYear: z.number().int().min(1900).max(2200),
  ethiopianMonth: z.number().int().min(1).max(13).optional().nullable(),
  ethiopianDay: z.number().int().min(1).max(30).optional().nullable(),
  title: z.string().min(1).max(180),
  detail: z.string().max(2000).optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

const visionInput = z.object({ title: z.string().min(1).max(180), reason: z.string().max(1000).optional().nullable(), category: z.string().max(80).default("life"), emoji: z.string().max(8).default("✦"), color: z.string().max(24).default("sun"), imageUrl: z.string().max(500).optional().nullable(), imageKey: z.string().max(500).optional().nullable() });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  dashboard: router({ get: protectedProcedure.query(({ ctx }) => getDashboardData(ctx.user.id)) }),
  profile: router({
    get: protectedProcedure.query(({ ctx }) => getOrCreateProfile(ctx.user.id)),
    update: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" }); await getOrCreateProfile(ctx.user.id); await db.update(profiles).set(input).where(eq(profiles.userId, ctx.user.id)); return getOrCreateProfile(ctx.user.id); }),
  }),
  vision: router({
    create: protectedProcedure.input(visionInput).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" }); await db.insert(visions).values({ userId: ctx.user.id, ...input }); return { success: true } as const; }),
    upload: protectedProcedure.input(z.object({ fileName: z.string().regex(/^[a-zA-Z0-9._-]+$/).max(120), contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]), dataBase64: z.string().max(8_000_000) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" }); const raw = input.dataBase64.replace(/^data:[^;]+;base64,/, ""); const bytes = Buffer.from(raw, "base64"); if (bytes.length > 6 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Images must be 6MB or smaller" }); const uploaded = await storagePut(`${ctx.user.id}-visions/${input.fileName}`, bytes, input.contentType); return uploaded; }),
    delete: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" }); await db.delete(visions).where(and(eq(visions.id, input.id), eq(visions.userId, ctx.user.id))); return { success: true } as const; }),
  }),
  plan: router({
    create: protectedProcedure.input(periodInput).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" }); await db.insert(plans).values({ userId: ctx.user.id, ...input, status: input.period === "day" ? "active" : "backlog" }); return { success: true } as const; }),
    status: protectedProcedure.input(z.object({ id: z.number().int(), status: z.enum(["backlog", "active", "done", "missed"]) })).mutation(async ({ ctx, input }) => { await updatePlanStatus(ctx.user.id, input.id, input.status); return { success: true } as const; }),
    delete: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" }); await db.delete(plans).where(and(eq(plans.id, input.id), eq(plans.userId, ctx.user.id))); return { success: true } as const; }),
  }),
  checkIn: router({ create: protectedProcedure.input(z.object({ planId: z.number().int().optional().nullable(), ethiopianDate: z.string().max(32), mood: z.number().int().min(1).max(5).optional().nullable(), note: z.string().max(1200).optional().nullable(), status: z.enum(["done", "missed", "rest"]) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" }); await db.insert(checkIns).values({ userId: ctx.user.id, ...input }); if (input.planId && input.status === "done") await updatePlanStatus(ctx.user.id, input.planId, "done"); return { success: true } as const; }) }),
  telegram: router({
    status: protectedProcedure.query(async ({ ctx }) => { const profile = await getOrCreateProfile(ctx.user.id); return { configured: telegramConfigured(), connected: Boolean(profile.telegramChatId), reminderEnabled: Boolean(profile.reminderEnabled), reminderTime: profile.reminderTime, connectUrl: telegramConfigured() ? getTelegramConnectUrl(await getTelegramLink(ctx.user.id)) : null }; }),
    disconnect: protectedProcedure.mutation(async ({ ctx }) => { await disconnectTelegram(ctx.user.id); return { success: true } as const; }),
  }),
  coach: router({
    chat: protectedProcedure.input(z.object({ message: z.string().min(1).max(2000) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" }); const context = await getUserPlanContext(ctx.user.id); await db.insert(coachMessages).values({ userId: ctx.user.id, role: "user", content: input.message }); const planDigest = context.plans.map(plan => `${plan.period}:${plan.title} [${plan.status}/${plan.priority}]`).join("; ") || "No plans yet"; const visionDigest = context.visions.map(vision => `${vision.emoji} ${vision.title} (${vision.category})`).join("; ") || "No visions yet"; const checkInDigest = context.checkIns.map(checkIn => `${checkIn.ethiopianDate}:${checkIn.status}`).join("; ") || "No check-ins yet"; const response = await invokeLLM({ messages: [{ role: "system", content: `You are YenePlan Coach, a grounded human-feeling personal growth companion. Be ${context.profile.coachTone}, kind, concise, and practical. Draw inspiration from broadly known self-improvement ideas such as Atomic Habits, Deep Work, Essentialism, and The 7 Habits of Highly Effective People, but do not fabricate quotes or pretend to be the authors. You may share a short attributed quote only when confident; otherwise paraphrase the principle and say it is a principle. Use gentle humor sparingly, never shame, never overuse emojis, and focus on one next action. User focus: ${context.profile.focus || "not set"}. Visions: ${visionDigest}. Plans: ${planDigest}. Recent check-ins: ${checkInDigest}. Keep responses under 120 words.` }, { role: "user", content: input.message }] }); const raw = response.choices?.[0]?.message?.content; const content = typeof raw === "string" ? raw : "Let’s make this smaller: choose one action you can finish in the next 15 minutes."; await db.insert(coachMessages).values({ userId: ctx.user.id, role: "assistant", content }); return { content }; }),
  }),
});

export type AppRouter = typeof appRouter;
