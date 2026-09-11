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
import { connectTelegramToken, createTelegramMood, createTelegramProgress, createTelegramTask, getProfileByTelegramChatId, getReminderRecipients, getTelegramTodayPlans, getUserPlanContext, moveTelegramTaskTomorrow, updateTelegramEnergy, updateTelegramPlan } from "../db";
import { configureTelegramWebhook, getTelegramWebAppUrl, isValidTelegramWebhook, sendTelegramMessage, telegramCall } from "../telegram";
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

const telegramOpenKeyboard = { inline_keyboard: [[{ text: "Open YenePlan", web_app: { url: getTelegramWebAppUrl() } }]] };

function telegramHelpText() {
  return "YenePlan quick actions\n\n/today — see today’s tasks\n/add Task title — add a task\n/done 1 — complete task #1 from /today\n/missed 1 — mark a task missed\n/later 1 — move task #1 to tomorrow\n/progress Finished my workout — log progress\n/mood 2 — log your battery from 1–5\n/energy low — show one tiny win\n/overwhelmed — enter anti-overwhelm mode\n\nYou can also tap Done or Missed under /today.";
}

async function sendTelegramQuickReply(chatId: string, text: string, replyMarkup?: Record<string, unknown>) {
  return telegramCall("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) });
}

async function handleTelegramCommand(chatId: string, text: string) {
  const [rawCommand, ...parts] = text.trim().split(/\s+/);
  const command = (rawCommand || "").split("@")[0].toLowerCase();
  const argument = parts.join(" ").trim();
  const linked = await getProfileByTelegramChatId(chatId);
  if (!linked && command !== "/start") {
    await sendTelegramQuickReply(chatId, "Open YenePlan once to connect this Telegram account securely. After that, you can manage tasks here without copy-pasting a code.", telegramOpenKeyboard);
    return;
  }
  if (command === "/help") {
    await sendTelegramQuickReply(chatId, telegramHelpText());
    return;
  }
  if (command === "/today") {
    const { profile, plans: todayPlans } = await getTelegramTodayPlans(chatId);
    if (!profile) return;
    const body = todayPlans.length ? todayPlans.map((plan, index) => `${index + 1}. ${plan.status === "done" ? "✅" : plan.status === "missed" ? "⚠️" : "▫️"} ${plan.title} [${plan.priority}]`).join("\n") : "No tasks yet. Add one small promise with /add Your task";
    const buttons = todayPlans.filter(plan => plan.status !== "done").slice(0, 8).map((plan, index) => [{ text: `✅ Done ${index + 1}`, callback_data: `done:${plan.id}` }, { text: `Miss ${index + 1}`, callback_data: `miss:${plan.id}` }]);
    await sendTelegramQuickReply(chatId, `Today · ${profile.ethiopianYear}-${profile.currentMonth}-${profile.currentDay}\n\n${body}`, buttons.length ? { inline_keyboard: buttons } : undefined);
    return;
  }
  if (command === "/add" || command === "/task") {
    if (!argument) { await sendTelegramQuickReply(chatId, "Tell me the task after the command. Example:\n/add Read 5 pages"); return; }
    const task = await createTelegramTask(chatId, argument.slice(0, 180));
    if (task) await sendTelegramQuickReply(chatId, `Added to today: “${task.title}”\n\nSmall enough to start? Good. Reply /done ${task.id} when it’s complete.`);
    return;
  }
  if (command === "/progress" || command === "/log") {
    if (!argument) { await sendTelegramQuickReply(chatId, "Tell me what happened after /progress. Example:\n/progress Finished my workout and felt better"); return; }
    const result = await createTelegramProgress(chatId, argument.slice(0, 2000), "done");
    if (result) await sendTelegramQuickReply(chatId, `Progress logged for ${result.ethiopianDate}.\n\nThat counts. Keep the next promise pleasantly small.`);
    return;
  }
  if (command === "/energy") {
    const energy = argument.toLowerCase() === "low" ? "low" : argument.toLowerCase() === "locked" ? "locked" : "normal";
    await updateTelegramEnergy(chatId, energy);
    await sendTelegramQuickReply(chatId, energy === "low" ? "Low battery mode on. We are not planning a six-hour transformation arc. Try /today and choose one tiny win." : energy === "locked" ? "Locked-in mode on. Your top three are visible now. Focus first, optimize later." : "Normal pace restored. Steady is a real strategy.");
    return;
  }
  if (command === "/overwhelmed") {
    await updateTelegramEnergy(chatId, "low");
    await sendTelegramQuickReply(chatId, "You do not need a new life plan right now. Low battery mode is on.\n\nTry this: open the smallest task and do it for ten minutes. Then reply /progress with what happened.");
    return;
  }
  if (command === "/mood") {
    const mood = Math.max(1, Math.min(5, Number(argument) || 3));
    await createTelegramMood(chatId, mood);
    await updateTelegramEnergy(chatId, mood <= 2 ? "low" : mood >= 4 ? "locked" : "normal");
    await sendTelegramQuickReply(chatId, mood <= 2 ? "Mood logged: low battery. We are switching to minimum viable day mode. One kind action is enough." : mood >= 4 ? "Mood logged: you have some charge. Pick one meaningful move before the dopamine goblins find you." : "Mood logged. A normal day is allowed to be normal.");
    return;
  }
  if (command === "/later") {
    const { plans: todayPlans } = await getTelegramTodayPlans(chatId);
    const numeric = Number(argument);
    const selected = Number.isInteger(numeric) && numeric > 0 && numeric <= todayPlans.length ? todayPlans[numeric - 1] : todayPlans.find(plan => plan.id === numeric);
    if (!selected) { await sendTelegramQuickReply(chatId, "Use /today first, then /later 1 to move the first task to tomorrow."); return; }
    await moveTelegramTaskTomorrow(chatId, selected.id);
    await sendTelegramQuickReply(chatId, `Moved “${selected.title}” to tomorrow. Future you has been notified gently.`);
    return;
  }
  if (command === "/done" || command === "/missed") {
    const { plans: todayPlans } = await getTelegramTodayPlans(chatId);
    const numeric = Number(argument);
    const selected = Number.isInteger(numeric) && numeric > 0 && numeric <= todayPlans.length ? todayPlans[numeric - 1] : todayPlans.find(plan => plan.id === numeric);
    if (!selected) { await sendTelegramQuickReply(chatId, "I couldn’t find that task in today’s list. Use /today first, then reply /done 1 or /missed 1."); return; }
    const status = command === "/done" ? "done" : "missed";
    await updateTelegramPlan(chatId, selected.id, status);
    await sendTelegramQuickReply(chatId, status === "done" ? `Done: “${selected.title}” ✅\n\nOne brick placed. That’s how the wall gets built.` : `Marked missed: “${selected.title}”.\n\nNo drama. Adjust the next move and continue.`);
    return;
  }
  if (command !== "/start") await sendTelegramQuickReply(chatId, telegramHelpText());
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
    const update = req.body as { message?: { chat?: { id?: number | string }; text?: string }; callback_query?: { id?: string; data?: string; message?: { chat?: { id?: number | string } } } };
    const messageChatId = update.message?.chat?.id;
    const callbackChatId = update.callback_query?.message?.chat?.id;
    const chatId = messageChatId ?? callbackChatId;
    const text = update.message?.text?.trim() || "";
    if (chatId && text.startsWith("/start")) {
      const token = text.split(/\s+/, 2)[1];
      const linked = token ? await connectTelegramToken(token, String(chatId)) : null;
      if (linked) await sendTelegramQuickReply(String(chatId), "Your YenePlan reminders are connected. Try /today to see your tasks, or /help for quick actions.", telegramOpenKeyboard);
      else await sendTelegramQuickReply(String(chatId), "Welcome to YenePlan. Open the planner below and your Telegram account will be detected automatically — no copy-paste connection code. After connecting, try /today or /add Your task.", telegramOpenKeyboard);
    } else if (chatId && text.startsWith("/")) {
      await handleTelegramCommand(String(chatId), text);
    } else if (chatId && update.callback_query?.data) {
      const [action, rawId] = update.callback_query.data.split(":");
      if (update.callback_query.id) await telegramCall("answerCallbackQuery", { callback_query_id: update.callback_query.id, text: action === "done" ? "Marked done" : "Marked missed" });
      const planId = Number(rawId);
      if (Number.isInteger(planId) && (action === "done" || action === "miss")) {
        const linked = await updateTelegramPlan(String(chatId), planId, action === "done" ? "done" : "missed");
        if (linked) await sendTelegramQuickReply(String(chatId), action === "done" ? "Task complete ✅ Keep the momentum gentle." : "Marked missed. Reset without the guilt; choose the next move.");
      }
    }
    return res.json({ ok: true });
  });
  app.post("/api/telegram/setup", async (req, res) => {
    const setupSecret = process.env.TELEGRAM_SETUP_SECRET;
    if (!setupSecret || req.headers.authorization !== `Bearer ${setupSecret}`) return res.status(401).json({ ok: false });
    if (!ENV.appBaseUrl) return res.status(400).json({ ok: false, message: "APP_BASE_URL is not configured" });
    try {
      await configureTelegramWebhook(`${ENV.appBaseUrl.replace(/\/$/, "")}/api/telegram/webhook`);
      await telegramCall("setMyCommands", { commands: [{ command: "today", description: "See today’s tasks" }, { command: "add", description: "Add a task to today" }, { command: "done", description: "Complete a task" }, { command: "missed", description: "Mark a task missed" }, { command: "later", description: "Move a task to tomorrow" }, { command: "progress", description: "Log today’s progress" }, { command: "mood", description: "Log your mood" }, { command: "energy", description: "Choose your energy pace" }, { command: "overwhelmed", description: "Get one tiny next step" }, { command: "help", description: "Show quick actions" }] });
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
      const buttons = tasks.map(task => [{ text: `✅ Done · ${task.title.slice(0, 28)}`, callback_data: `done:${task.id}` }]);
      await telegramCall("sendMessage", { chat_id: profile.telegramChatId, text: `YenePlan check-in\n\n${body}\n\nPick one move. Not all three. We are not auditioning for burnout.`, disable_web_page_preview: true, reply_markup: { inline_keyboard: [...buttons, [{ text: "Open today", web_app: { url: getTelegramWebAppUrl() } }]] } });
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
