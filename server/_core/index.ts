import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { connectTelegramToken, getReminderRecipients, getUserPlanContext } from "../db";
import { configureTelegramWebhook, isValidTelegramWebhook, sendTelegramMessage } from "../telegram";
import { ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/telegram/webhook", async (req, res) => {
    if (!isValidTelegramWebhook(new Request("http://localhost", { headers: req.headers as Record<string, string> }))) return res.status(401).json({ ok: false });
    const update = req.body as { message?: { chat?: { id?: number | string }; text?: string; from?: { first_name?: string } } };
    const chatId = update.message?.chat?.id;
    const text = update.message?.text?.trim() || "";
    if (chatId && text.startsWith("/start")) {
      const token = text.split(/\s+/, 2)[1];
      const linked = token ? await connectTelegramToken(token, String(chatId)) : null;
      if (linked) await sendTelegramMessage(String(chatId), "Your YenePlan reminders are connected. You are in charge of the plan; I am only here to nudge the next step. Use /help for options.");
      else await sendTelegramMessage(String(chatId), "Welcome to YenePlan. Open the connection link from your private Settings page to connect this chat safely.");
    } else if (chatId && text === "/help") {
      await sendTelegramMessage(String(chatId), "YenePlan can remind you about today’s plan and help you keep a gentle promise. Manage consent and reminder time in Settings.");
    }
    return res.json({ ok: true });
  });
  app.post("/api/telegram/setup", async (req, res) => {
    const setupSecret = process.env.TELEGRAM_SETUP_SECRET;
    if (!setupSecret || req.headers.authorization !== `Bearer ${setupSecret}`) return res.status(401).json({ ok: false });
    if (!ENV.appBaseUrl) return res.status(400).json({ ok: false, message: "APP_BASE_URL is not configured" });
    try {
      await configureTelegramWebhook(`${ENV.appBaseUrl.replace(/\/$/, "")}/api/telegram/webhook`);
      return res.json({ ok: true, webhook: `${ENV.appBaseUrl.replace(/\/$/, "")}/api/telegram/webhook` });
    } catch (error) {
      return res.status(500).json({ ok: false, message: error instanceof Error ? error.message : "Telegram setup failed" });
    }
  });
  app.post("/api/telegram/reminders", async (req, res) => {
    const secret = process.env.TELEGRAM_CRON_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ ok: false });
    const recipients = await getReminderRecipients();
    let sent = 0;
    for (const profile of recipients) {
      if (!profile.telegramChatId) continue;
      const context = await getUserPlanContext(profile.userId);
      const tasks = context.plans.filter(plan => plan.period === "day" && plan.status !== "done").slice(0, 3);
      const body = tasks.length ? tasks.map((task, index) => `${index + 1}. ${task.title}`).join("\n") : "No daily tasks yet — choose one small action before the day gets noisy.";
      await sendTelegramMessage(profile.telegramChatId, `YenePlan check-in\n\n${body}\n\nReply in the app when you have kept the next promise.`);
      sent += 1;
    }
    return res.json({ ok: true, sent });
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
