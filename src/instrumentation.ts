/**
 * Server start hook (Next.js instrumentation) — runs once when the Node server
 * boots, before any request is served.
 *
 * The gold price is pulled from the union / TGJU **on a schedule**, not by
 * visitors: the union's board can take 30-40s to answer, so a pull that only
 * happens when somebody happens to visit is both slow and unreliable. Here the
 * server keeps the cache warm on its own, and every user instantly reads a
 * fresh value without waiting for the upstream.
 */
export async function register() {
  // Edge runtime has no timers/DB — the poller only makes sense on the Node server.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startGoldPricePoller } = await import("./lib/gold-price-poller");
  startGoldPricePoller();
}
