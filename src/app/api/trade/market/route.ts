import { NextRequest, NextResponse } from "next/server";
import { ok, error } from "@/lib/response";
import { corsPreflight, withCors } from "@/lib/cors";
import { livePrices, TRADE_SYMBOLS, isPriceChoice, type PriceChoice } from "@/lib/trade-market";
import { getCandles, getTicks, recordTick, normalizeRange, TRADE_RANGES, getAll24hStats } from "@/lib/trading";

/**
 * PUBLIC market feed for the trading PWA.
 *
 *   GET /api/trade/market
 *     → symbols, live prices, 24h stats, source info
 *   GET /api/trade/market?statsOnly=1
 *     → just prices + stats (market dropdown, cheap poll)
 *   GET /api/trade/market?symbol=GOLD18&range=24h
 *     → …plus candles + ticks for the chart
 *   GET /api/trade/market?symbol=GOLD18&record=1
 *     → and stores the sample so the chart has history over time
 *
 * The price source is chosen with `?source=auto|estjt|tgju|akbari`; when omitted
 * it falls back to whatever the admin set site-wide, so the trading board and
 * the public rates board never drift apart.
 */
export async function GET(req: NextRequest) {
  if (req.method === "OPTIONS") return corsPreflight(req);

  const url = new URL(req.url);
  const symbol = (url.searchParams.get("symbol") ?? "").trim();
  const range = normalizeRange(url.searchParams.get("range"));
  const sourceParam = url.searchParams.get("source");
  const wantsRecord = url.searchParams.get("record") === "1";
  const statsOnly = url.searchParams.get("statsOnly") === "1";

  // No explicit source → the site's own setting (null = use stored choice).
  const choice: PriceChoice | null = isPriceChoice(sourceParam) ? sourceParam : null;

  try {
    const market = await livePrices(choice);

    if (symbol && !statsOnly && !(symbol in market.prices)) {
      return withCors(req, error(`نماد «${symbol}» قیمت ندارد`, 404));
    }

    // Sample the series so the chart accumulates history from real traffic.
    if (wantsRecord) {
      for (const [sym, price] of Object.entries(market.prices)) {
        recordTick(sym, price, market.source);
      }
    }

    const payload: Record<string, unknown> = {
      symbols: TRADE_SYMBOLS,
      prices: market.prices,
      // akbari-style side quotes (empty objects when the source has no margins)
      buys: market.buys,
      sells: market.sells,
      stats: getAll24hStats(market.prices),
      source: market.source,
      sourceTitle: market.sourceTitle,
      updatedAt: market.updatedAt,
      stale: market.stale,
      ranges: TRADE_RANGES,
      ...(market.note ? { note: market.note } : {}),
    };

    if (!statsOnly && symbol) {
      payload.symbol = symbol;
      payload.range = range;
      payload.candles = getCandles(symbol, range);
      payload.ticks = getTicks(symbol, range);
      payload.price = market.prices[symbol];
    }

    return withCors(req, ok(payload));
  } catch (e) {
    console.error("[trade/market] error:", e);
    return withCors(req, NextResponse.json({ success: false, error: "خطای سرور" }, { status: 500 }));
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}
