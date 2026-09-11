import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { getDb, getDashboardData, getOrCreateProfile, getUserPlanContext, updatePlanStatus } from "./db";
import { checkIns, coachMessages, plans, profiles, visions } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const profileInput = z.object({
  displayName: z.string().max(120).optional().nullable(),
  ethiopianYear: z.number().int().min(1900).max(2200).optional(),
  currentMonth: z.number().int().min(1).max(13).optional(),
  currentDay: z.number().int().min(1).max(30).optional(),
  focus: z.string().max(1000).optional().nullable(),
  timezone: z.string().max(80).optional(),
  coachTone: z.enum(["warm", "direct", "chaotic"]).optional(),
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

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: router({
    get: protectedProcedure.query(({ ctx }) => getDashboardData(ctx.user.id)),
  }),
  profile: router({
    get: protectedProcedure.query(({ ctx }) => getOrCreateProfile(ctx.user.id)),
    update: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
      await getOrCreateProfile(ctx.user.id);
      await db.update(profiles).set(input).where(eq(profiles.userId, ctx.user.id));
      return getOrCreateProfile(ctx.user.id);
    }),
  }),
  vision: router({
    create: protectedProcedure.input(z.object({ title: z.string().min(1).max(180), reason: z.string().max(1000).optional().nullable(), category: z.string().max(80).default("life"), emoji: z.string().max(8).default("✦"), color: z.string().max(24).default("sun") })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
      await db.insert(visions).values({ userId: ctx.user.id, ...input });
      return { success: true } as const;
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
      await db.delete(visions).where(and(eq(visions.id, input.id), eq(visions.userId, ctx.user.id)));
      return { success: true } as const;
    }),
  }),
  plan: router({
    create: protectedProcedure.input(periodInput).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
      await db.insert(plans).values({ userId: ctx.user.id, ...input, status: input.period === "day" ? "active" : "backlog" });
      return { success: true } as const;
    }),
    status: protectedProcedure.input(z.object({ id: z.number().int(), status: z.enum(["backlog", "active", "done", "missed"]) })).mutation(async ({ ctx, input }) => {
      await updatePlanStatus(ctx.user.id, input.id, input.status);
      return { success: true } as const;
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
      await db.delete(plans).where(and(eq(plans.id, input.id), eq(plans.userId, ctx.user.id)));
      return { success: true } as const;
    }),
  }),
  checkIn: router({
    create: protectedProcedure.input(z.object({ planId: z.number().int().optional().nullable(), ethiopianDate: z.string().max(32), mood: z.number().int().min(1).max(5).optional().nullable(), note: z.string().max(1200).optional().nullable(), status: z.enum(["done", "missed", "rest"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
      await db.insert(checkIns).values({ userId: ctx.user.id, ...input });
      if (input.planId && input.status === "done") await updatePlanStatus(ctx.user.id, input.planId, "done");
      return { success: true } as const;
    }),
  }),
  coach: router({
    chat: protectedProcedure.input(z.object({ message: z.string().min(1).max(2000) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
      const context = await getUserPlanContext(ctx.user.id);
      await db.insert(coachMessages).values({ userId: ctx.user.id, role: "user", content: input.message });
      const planDigest = context.plans.map(plan => `${plan.period}:${plan.title} [${plan.status}/${plan.priority}]`).join("; ") || "No plans yet";
      const visionDigest = context.visions.map(vision => `${vision.emoji} ${vision.title} (${vision.category})`).join("; ") || "No visions yet";
      const checkInDigest = context.checkIns.map(checkIn => `${checkIn.ethiopianDate}:${checkIn.status}`).join("; ") || "No check-ins yet";
      const response = await invokeLLM({
        messages: [
          { role: "system", content: `You are YenePlan Coach, an Ethiopian-calendar accountability coach. Be ${context.profile.coachTone}; use light humor and occasional Amharic-flavored warmth, but never shame the user. Be practical: turn vague ideas into the next tiny action, keep advice tied to the user's stated plans, and ask at most one question. User focus: ${context.profile.focus || "not set"}. Visions: ${visionDigest}. Plans: ${planDigest}. Recent check-ins: ${checkInDigest}. Keep responses under 120 words.` },
          { role: "user", content: input.message },
        ],
      });
      const raw = response.choices?.[0]?.message?.content;
      const content = typeof raw === "string" ? raw : "Your coach brain is warming up. Pick one tiny action for today and tell me when it is done.";
      await db.insert(coachMessages).values({ userId: ctx.user.id, role: "assistant", content });
      return { content };
    }),
  }),
});

export type AppRouter = typeof appRouter;
