import { ENV } from "./_core/env";
import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramUpdate = {
  message?: { chat?: { id?: number | string }; text?: string; from?: { first_name?: string } };
};

export function telegramConfigured() {
  return Boolean(ENV.telegramBotToken && ENV.telegramBotUsername);
}

export function getTelegramConnectUrl(token: string) {
  return `https://t.me/${ENV.telegramBotUsername}?start=${encodeURIComponent(token)}`;
}

export function getTelegramWebAppUrl() {
  return `${ENV.appBaseUrl.replace(/\/$/, "")}/settings?telegram=1`;
}

export async function telegramCall<T>(method: string, body: Record<string, unknown>): Promise<T> {
  if (!ENV.telegramBotToken) throw new Error("Telegram bot is not configured");
  const response = await fetch(`https://api.telegram.org/bot${ENV.telegramBotToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json() as { ok: boolean; result?: T; description?: string };
  if (!response.ok || !payload.ok) throw new Error(payload.description || `Telegram ${method} failed`);
  return payload.result as T;
}

export async function sendTelegramMessage(chatId: string, text: string) {
  return telegramCall("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
}

export function validateTelegramWebAppData(initData: string) {
  if (!ENV.telegramBotToken || !initData) return null;
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  if (!receivedHash) return null;
  params.delete("hash");
  const dataCheckString = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(ENV.telegramBotToken).digest();
  const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (receivedHash.length !== calculatedHash.length || !timingSafeEqual(Buffer.from(receivedHash), Buffer.from(calculatedHash))) return null;
  const authDate = Number(params.get("auth_date"));
  if (!authDate || Math.abs(Date.now() / 1000 - authDate) > 86400) return null;
  try { return JSON.parse(params.get("user") || "null") as { id?: number; first_name?: string; username?: string } | null; } catch { return null; }
}

export async function configureTelegramWebhook(webhookUrl: string) {
  if (!telegramConfigured()) throw new Error("Telegram bot is not configured");
  return telegramCall("setWebhook", {
    url: webhookUrl,
    secret_token: ENV.telegramWebhookSecret || undefined,
    allowed_updates: ["message", "callback_query"],
  });
}

export function isValidTelegramWebhook(request: Request) {
  if (!ENV.telegramWebhookSecret) return true;
  return request.headers.get("x-telegram-bot-api-secret-token") === ENV.telegramWebhookSecret;
}
