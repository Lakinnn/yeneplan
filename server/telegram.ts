import { ENV } from "./_core/env";

export type TelegramUpdate = {
  message?: { chat?: { id?: number | string }; text?: string; from?: { first_name?: string } };
};

export function telegramConfigured() {
  return Boolean(ENV.telegramBotToken && ENV.telegramBotUsername);
}

export function getTelegramConnectUrl(token: string) {
  return `https://t.me/${ENV.telegramBotUsername}?start=${encodeURIComponent(token)}`;
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

export async function configureTelegramWebhook(webhookUrl: string) {
  if (!telegramConfigured()) throw new Error("Telegram bot is not configured");
  return telegramCall("setWebhook", {
    url: webhookUrl,
    secret_token: ENV.telegramWebhookSecret || undefined,
    allowed_updates: ["message"],
  });
}

export function isValidTelegramWebhook(request: Request) {
  if (!ENV.telegramWebhookSecret) return true;
  return request.headers.get("x-telegram-bot-api-secret-token") === ENV.telegramWebhookSecret;
}
