/**
 * Server-side gold-price poller.
 *
 * The union's board (estjt.ir) can take 30-40s to answer, and it is the price
 * customers compare against — so the reading must not depend on a visitor
 * happening to open the site. This runs a self-scheduled loop inside the Node
 * server (started once from `src/instrumentation.ts`) and keeps the API cache
 * warm, so:
 *
 *   • every shopper instantly reads an already-fresh number, and
 *   • the site is still correct at 3am with zero traffic.
 *
 * Interval is intentionally larger than the union's own refresh cadence — it
 * only guards against the cache going cold, it does not need to poll faster.
 */

import { getSetting } from "./settings";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
/** Give the server a moment to finish booting before the first pull. */
const WARMUP_MS = 2_000;

declare global {
  // eslint-disable-next-line no-var
  var __dellyGoldPricePoller: boolean | undefined;
}

/** Read the site-wide source choice without importing route internals. */
function currentChoice(): "auto" | "estjt" | "tgju" | "akbari" {
  try {
    const v = (getSetting("gold_price_source") ?? "").trim();
    return v === "estjt" || v === "tgju" || v === "akbari" ? v : "auto";
  } catch {
    return "auto";
  }
}

function log(message: string): void {
  console.log(`[gold-price] ${message}`);
}

/**
 * This server's own base URL — the poller pulls through the real API route so
 * the scheduled run and a shopper's refresh button behave identically.
 * `HOSTNAME` is 0.0.0.0 in Docker, so always dial the loopback address.
 */
function selfBaseUrl(): string {
  return `http://127.0.0.1:${process.env.PORT || "3000"}`;
}

/**
 * One scheduled cycle: ask our own endpoint for a genuinely new reading.
 * Using the real route means the poller and a shopper pressing the refresh
 * button share one code path — the same cache, the same snapshot, the same
 * in-flight guard — so they can never fight over the union.
 */
async function tick(): Promise<void> {
  const choice = currentChoice();
  const started = Date.now();
  try {
    const res = await fetch(`${selfBaseUrl()}/api/admin/gold-price?source=${choice}&refresh=1`, {
      cache: "no-store",
    });
    const json = await res.json();
    const data = json?.data;
    const ms = Date.now() - started;
    if (data && !data.fallback) {
      log(`updated from ${data.sourceKey ?? data.source} · 18k=${data.rates?.gold18k ?? "?"} · ${ms}ms`);
    } else {
      log(`upstream did not answer this cycle (${ms}ms) — keeping last known rates`);
    }
  } catch (e) {
    log(`cycle failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Start the loop once per process. Safe to call repeatedly (Next may re-run the
 * instrumentation hook in dev); the global guard keeps a single timer.
 */
export function startGoldPricePoller(): void {
  if (globalThis.__dellyGoldPricePoller) return;
  globalThis.__dellyGoldPricePoller = true;

  log(`starting — every ${Math.round(POLL_INTERVAL_MS / 1000)}s, source=${currentChoice()}`);

  const run = () => {
    void tick().finally(() => {
      setTimeout(run, POLL_INTERVAL_MS);
    });
  };

  setTimeout(run, WARMUP_MS).unref?.();
}