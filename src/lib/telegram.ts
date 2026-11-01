/**
 * Minimal Telegram Bot API helper.
 * Uses global fetch — no extra dependencies.
 */

const API_BASE = "https://api.telegram.org";

export interface TgUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type?: string };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
  };
}

function token(): string {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
}

export function tgConfigured(): boolean {
  return token().length > 10;
}

async function call(method: string, payload: Record<string, unknown>) {
  const t = token();
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN missing");
  const res = await fetch(`${API_BASE}/bot${t}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data as { ok?: boolean }).ok === false) {
    throw new Error(`Telegram API ${method} failed: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return (data as { result?: unknown }).result;
}

export function tgSendMessage(chatId: number | string, text: string, replyMarkup?: Record<string, unknown>) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export function tgGetUpdates(offset?: number, timeout = 25) {
  return call("getUpdates", {
    ...(offset !== undefined ? { offset } : {}),
    timeout,
    allowed_updates: ["message"],
  }) as Promise<TgUpdate[]>;
}

export function tgSetWebhook(url: string) {
  return call("setWebhook", { url });
}

export function tgDeleteWebhook() {
  return call("deleteWebhook", { drop_pending_updates: false });
}

export function tgGetMe() {
  return call("getMe", {}) as Promise<{ id: number; username?: string; first_name?: string }>;
}

export function tgReplyKeyboard(rows: string[][]) {
  return {
    keyboard: rows.map(r => r.map(t => ({ text: t }))),
    resize_keyboard: true,
  };
}

export function tgRemoveKeyboard() {
  return { remove_keyboard: true };
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
