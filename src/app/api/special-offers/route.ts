import { NextRequest } from "next/server";
import { specialOffers, getDb } from "@/lib/db";
import { ok, serverError } from "@/lib/response";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const db = getDb();
    const setting = (key: string, fallback: string): string => {
      try {
        const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
        return row?.value ?? fallback;
      } catch { return fallback; }
    };
    const offers = specialOffers.listWithProduct({ activeOnly: true });
    return ok({
      offers,
      title: setting("special_offers_title", "پیشنهاد شگفت انگیز"),
      view_all_href: setting("special_offers_href", "/products"),
      enabled: setting("special_offers_enabled", "1") === "1",
      end_at: setting("special_offers_end", ""),
    });
  } catch (e) { console.error(e); return serverError(); }
}