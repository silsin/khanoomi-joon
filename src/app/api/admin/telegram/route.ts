import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ok, error } from "@/lib/response";
import { tgGetMe, tgSetWebhook, tgDeleteWebhook, tgConfigured } from "@/lib/telegram";

export const dynamic = "force-dynamic";

function baseUrl(req: NextRequest): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || req.nextUrl.origin).replace(/\/$/, "");
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if ("error" in auth) return error(auth.error, auth.status);
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || "";
  const { getDb } = await import("@/lib/db");
  let admins: number[] = [];
  try {
    const db = getDb();
    db.exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    const row = db.prepare("SELECT value FROM settings WHERE key='telegram_admin_ids'").get() as { value: string } | undefined;
    const raw = (row?.value?.trim() || process.env.TELEGRAM_ADMIN_IDS?.trim() || "");
    admins = raw.split(/[,\s]+/).map(s => parseInt(s, 10)).filter(n => !Number.isNaN(n));
  } catch {}
  return ok({
    configured: tgConfigured(),
    admins,
    webhook: secret ? baseUrl(req) + "/api/telegram?secret=" + secret : null,
  });
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if ("error" in auth) return error(auth.error, auth.status);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  if (!tgConfigured()) return error("TELEGRAM_BOT_TOKEN missing");
  try {
    if (action === "connect") {
      const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || "";
      if (!secret) return error("Set TELEGRAM_WEBHOOK_SECRET first");
      await tgSetWebhook(baseUrl(req) + "/api/telegram?secret=" + secret);
      const me = await tgGetMe();
      return ok({ connected: true, bot: me });
    }
    if (action === "disconnect") {
      await tgDeleteWebhook();
      return ok({ connected: false });
    }
    if (action === "test") {
      const me = await tgGetMe();
      return ok({ bot: me });
    }
    return error("Unknown action");
  } catch (e) {
    return error(e instanceof Error ? e.message : "Telegram error");
  }
}
