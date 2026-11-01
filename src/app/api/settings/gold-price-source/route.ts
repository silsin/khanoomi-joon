import { NextRequest } from "next/server";
import { getSetting } from "@/lib/settings";
import { ok } from "@/lib/response";

/** PUBLIC (no auth) — returns the admin's server-side default price source.
 * The public rates board uses this as its default; the operator's own browser
 * preference (localStorage) is an override, not the source of truth. */
export async function GET() {
  try {
    const v = getSetting("gold_price_source")?.trim() ?? "auto";
    const valid: string[] = ["auto", "estjt", "tgju", "akbari"];
    return ok({
      success: true,
      data: {
        source: valid.includes(v) ? v : "auto",
        label: v,
        note: valid.includes(v) ? "" : "نوع منبع ذخیره‌شده نامعتبر است، ریزه به خودکار",
      },
    });
  } catch (e) {
    console.error("[gold-price-source] GET error:", e);
    return ok({ success: true, data: { source: "auto", label: "", note: "" } });
  }
}
