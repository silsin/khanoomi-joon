import { NextRequest } from "next/server";
import { ok, error, serverError } from "@/lib/response";
import { corsPreflight, withCors } from "@/lib/cors";
import { listCatalog, priceItem, seedCatalog } from "@/lib/wholesale";
import { livePrices } from "@/lib/trade-market";

/**
 * PUBLIC catalog with live prices — what the goldsmith sees when ordering.
 *
 * Each item is priced from the same live board the site uses, so the goldsmith
 * always sees today's cost, never a stale table.
 *
 *   GET /api/trade/catalog                  → catalog + prices
 *   GET /api/trade/catalog?seed=1           → also restore default items (admin)
 */
export async function GET(req: NextRequest) {
  if (req.method === "OPTIONS") return corsPreflight(req);

  const url = new URL(req.url);
  try {
    if (url.searchParams.get("seed") === "1") seedCatalog();

    const market = await livePrices("auto");
    const items = listCatalog(true).map(item => ({
      ...item,
      basePrice: market.prices[item.symbol] ?? 0,
      unitPrice: priceItem(item, market.prices[item.symbol] ?? 0),
    }));

    return withCors(
      req,
      ok({
        items,
        prices: market.prices,
        source: market.source,
        sourceTitle: market.sourceTitle,
        updatedAt: market.updatedAt,
        stale: market.stale,
        ...(market.note ? { note: market.note } : {}),
      })
    );
  } catch (e) {
    console.error("[trade/catalog] error:", e);
    return withCors(req, serverError());
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}
