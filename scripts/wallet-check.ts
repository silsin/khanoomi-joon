/**
 * Wallet engine check — a throwaway harness, not a unit test.
 *
 * It drives the real trading functions against a scratch SQLite file and asserts
 * the money moves correctly, because the wallet has to be exactly right: a
 * balance that drifts by a single Toman is a support ticket at best and a real
 * accounting problem at worst.
 *
 *   node scripts/wallet-check.ts
 */

process.env.DATABASE_URL = "file:./data/wallet-check.db";

let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS  ${label}${detail ? `  →  ${detail}` : ""}`);
  } else {
    failed++;
    console.log(`FAIL  ${label}${detail ? `  →  ${detail}` : ""}`);
  }
}

async function main() {
  const fs = await import("node:fs");
  // Start from a clean file every run: leftover rows would make the balance and
  // the ledger disagree, which is exactly what we are testing.
  try {
    fs.rmSync("./data/wallet-check.db", { force: true });
  } catch {
    /* first run */
  }

  const t = await import("../src/lib/trading");
  const USER = "wallet-check-user";
  const PRICES = { GOLD18: 6_000_000, GOLD24: 7_500_000 };

  // ── Wallet starts empty ───────────────────────────────────────────────────
  check("new wallet starts at 0", t.getWallet(USER).balance === 0, `${t.getWallet(USER).balance}`);

  // ── Deposits ──────────────────────────────────────────────────────────────
  t.deposit(USER, 100_000_000);
  check("deposit credits balance", t.getWallet(USER).balance === 100_000_000, `${t.getWallet(USER).balance}`);

  try {
    t.deposit(USER, -500);
    check("negative deposit rejected", false, "no error thrown");
  } catch (e) {
    check("negative deposit rejected", e instanceof t.TradeError, (e as Error).message);
  }

  try {
    t.deposit(USER, 999_999_999);
    check("over-ceiling deposit rejected", false, "no error thrown");
  } catch (e) {
    check("over-ceiling deposit rejected", e instanceof t.TradeError, (e as Error).message);
  }

  // ── Buy: debits amount + fee, holds the weight ────────────────────────────
  const buy1 = t.placeOrder(USER, { symbol: "GOLD18", side: "BUY", grams: 5, price: PRICES.GOLD18 });
  check(
    "buy debits amount + fee",
    t.getWallet(USER).balance === 100_000_000 - buy1.amount - buy1.fee,
    `${t.getWallet(USER).balance}`
  );
  check("position holds 5 g", t.getPosition(USER, "GOLD18")!.grams === 5, `${t.getPosition(USER, "GOLD18")!.grams}`);
  check("avgCost is entry price", t.getPosition(USER, "GOLD18")!.avgCost === PRICES.GOLD18);

  // ── Second buy accumulates and keeps a weighted average ───────────────────
  t.placeOrder(USER, { symbol: "GOLD18", side: "BUY", grams: 3, price: PRICES.GOLD18 });
  check("second buy accumulates", t.getPosition(USER, "GOLD18")!.grams === 8, `${t.getPosition(USER, "GOLD18")!.grams}`);
  check("avgCost stays flat at same price", t.getPosition(USER, "GOLD18")!.avgCost === PRICES.GOLD18);

  // ── Convert: 4 g of GOLD18 → GOLD24, cash untouched ───────────────────────
  const before = t.getWallet(USER).balance;
  const conv = t.convert(USER, {
    fromSymbol: "GOLD18",
    toSymbol: "GOLD24",
    grams: 4,
    prices: PRICES,
  });

  check("convert keeps GOLD18 grams", conv.gramsOut === 4, `${conv.gramsOut}`);
  check("convert fee is 0.5% of gross", conv.fee === 120_000, `${conv.fee}`);
  check("convert nets grams correctly", Number(conv.gramsIn.toFixed(3)) === 3.184, `${conv.gramsIn}`);
  check("GOLD18 reduced by 4 g", t.getPosition(USER, "GOLD18")!.grams === 4, `${t.getPosition(USER, "GOLD18")!.grams}`);
  check(
    "GOLD24 created with converted weight",
    t.getPosition(USER, "GOLD24")!.grams === conv.gramsIn,
    `${t.getPosition(USER, "GOLD24")!.grams}`
  );
  check(
    "convert leaves cash untouched",
    t.getWallet(USER).balance === before,
    `${t.getWallet(USER).balance} vs ${before}`
  );

  // ── Convert must trade on both sides of the spread ────────────────────────
  // The source is sold (bid) and the target bought (ask), exactly as /order
  // does. Filling both at the mid would silently hand the user the shop's
  // margin, so this is worth pinning down with a real spread.
  const SPREAD = {
    prices: { GOLD18: 6_000_000, GOLD24: 7_500_000 },
    sells: { GOLD18: 5_940_000, GOLD24: 7_425_000 }, // bid = mid − 1%
    buys: { GOLD18: 6_060_000, GOLD24: 7_575_000 }, // ask = mid + 1%
  };
  t.deposit(USER, 50_000_000);
  t.placeOrder(USER, { symbol: "GOLD18", side: "BUY", grams: 10, price: SPREAD.buys.GOLD18 });
  const g24Before = t.getPosition(USER, "GOLD24");
  const cashBefore = t.getWallet(USER).balance;
  // Remember how many CONVERT rows existed, so the ledger assertions below can
  // isolate exactly the three this call is about to write.
  const ledgerRowsBeforeSpreadConvert = t
    .listTransactions(USER, 500)
    .filter(x => x.kind === "CONVERT").length;

  const spreadConv = t.convert(USER, {
    fromSymbol: "GOLD18",
    toSymbol: "GOLD24",
    grams: 2,
    ...SPREAD,
  });

  check("source leg fills at the bid", spreadConv.priceOut === 5_940_000, `${spreadConv.priceOut}`);
  check("target leg fills at the ask", spreadConv.priceIn === 7_575_000, `${spreadConv.priceIn}`);
  const expectedIn = (2 * 5_940_000 * 0.995) / 7_575_000;
  check("spread-aware gramsIn", spreadConv.gramsIn === expectedIn, `${spreadConv.gramsIn}`);
  check(
    "spread convert weights into existing holding",
    t.getPosition(USER, "GOLD24")!.grams === (g24Before?.grams ?? 0) + expectedIn,
    `${t.getPosition(USER, "GOLD24")!.grams}`
  );
  check(
    "spread convert leaves cash untouched",
    t.getWallet(USER).balance === cashBefore,
    `${t.getWallet(USER).balance} vs ${cashBefore}`
  );

  // ── Convert legs hit the ledger with signed reference amounts ─────────────
  // Scope to the rows the *second* convert wrote, by counting the ledger before
  // it ran — far more robust than matching on note text.
  const newConvertRows = t
    .listTransactions(USER, 500)
    .filter(x => x.kind === "CONVERT")
    .slice(0, ledgerRowsBeforeSpreadConvert);
  const legs = newConvertRows;
  // Two legs plus the fee row — all kind CONVERT, because none of them moves cash.
  check("convert writes three rows", legs.length === 3, `${legs.length} rows`);

  // The statement is the user's proof of what happened, so its wording must be
  // readable on its own — this guards the Persian labels and the +/- signs.
  check(
    "convert legs are signed as sell then buy",
    legs.some(l => l.amount < 0 && l.symbol === "GOLD24") === false &&
      legs.some(l => l.amount < 0 && l.symbol === "GOLD18") &&
      legs.some(l => l.amount > 0 && l.symbol === "GOLD24"),
    legs.map(l => `${l.kind} ${l.amount} ${l.symbol}`).join(" | ")
  );

  // A convert's commission is withheld inside the swap, not charged to the cash
  // balance — so gross minus net is exactly the fee. Compare against the spread
  // convert's own fee, since `legs` now isolates that one.
  const legRows = legs.filter(l => l.note.includes("— فروش") || l.note.includes("— خرید"));
  const convertGross = legRows.filter(l => l.amount < 0).reduce((s, l) => s - l.amount, 0);
  const convertNet = legRows.filter(l => l.amount > 0).reduce((s, l) => s + l.amount, 0);
  check(
    "convert legs differ by the fee",
    legRows.length === 2 && convertGross - convertNet === spreadConv.fee,
    `${convertGross} - ${convertNet} = ${convertGross - convertNet}`
  );

  // ── Sell credits net of fee ───────────────────────────────────────────────
  // Baseline taken here, not from the first convert: this test has since run a
  // second deposit, buy and convert in between.
  const beforeSell = t.getWallet(USER).balance;
  const sell = t.placeOrder(USER, { symbol: "GOLD24", side: "SELL", grams: 1, price: PRICES.GOLD24 });
  check(
    "sell credits net of fee",
    t.getWallet(USER).balance === beforeSell + sell.amount - sell.fee,
    `${t.getWallet(USER).balance}`
  );

  // ── Withdraw ──────────────────────────────────────────────────────────────
  const wd = t.withdraw(USER, 1_000_000, "تست برداشت");
  check(
    "withdraw debits balance",
    wd.balance === beforeSell + sell.amount - sell.fee - 1_000_000,
    `${wd.balance}`
  );

  try {
    t.withdraw(USER, 999_999_999);
    check("overdraw blocked", false, "no error thrown");
  } catch (e) {
    check("overdraw blocked", e instanceof t.TradeError, (e as Error).message);
  }

  // ── Ledger reconciliation ─────────────────────────────────────────────────
  // CONVERT rows carry a signed *reference* figure but move no cash, so they must
  // be excluded; everything else is a real cash movement and must sum exactly.
  const ledger = t.listTransactions(USER, 500);
  const sum = ledger.filter(l => l.kind !== "CONVERT").reduce((acc, l) => acc + l.amount, 0);
  check("ledger has rows", ledger.length >= 8, `${ledger.length} rows`);
  check(
    "ledger sums to the balance",
    sum === t.getWallet(USER).balance,
    `${sum.toLocaleString()} vs ${t.getWallet(USER).balance.toLocaleString()}`
  );
  check("statement labels are non-empty", ledger.every(l => l.note.length > 0), `${ledger.length} rows`);

  // Every kind must appear at least once, so the statement is never blank.
  const kinds = new Set(ledger.map(l => l.kind));
  check(
    "statement shows every kind",
    ["DEPOSIT", "BUY", "SELL", "FEE", "WITHDRAW", "CONVERT"].every(k => kinds.has(k as never)),
    [...kinds].join(", ")
  );

  // ── Account view ──────────────────────────────────────────────────────────
  const acct = t.getAccount(USER, PRICES);
  check("account cash matches wallet", acct.wallet.balance === t.getWallet(USER).balance);
  check(
    "account equity = cash + gold value",
    acct.equity === acct.wallet.balance + acct.positions.reduce((s, p) => s + p.marketValue, 0),
    `${acct.equity}`
  );

  // ── Statement (visual sanity check) ───────────────────────────────────────
  console.log("\n--- statement ---");
  for (const l of ledger.slice(0, 12)) {
    console.log(
      `  ${l.kind.padEnd(9)} ${String(l.amount).padStart(15)}  ${(l.symbol ?? "-").padEnd(8)} ${l.note}`
    );
  }
  console.log("\n--- account ---");
  console.log(`  cash     ${acct.wallet.balance.toLocaleString()}`);
  console.log(`  equity   ${acct.equity.toLocaleString()}`);
  console.log(`  totalPnl ${acct.totalPnl.toLocaleString()}`);
  console.log(`  fee      ${acct.feePercent}%`);
  for (const p of acct.positions) {
    console.log(`  ${p.symbol.padEnd(10)} ${p.grams.toFixed(3)}  pnl ${p.pnl.toLocaleString()}`);
  }

  console.log(failed === 0 ? "\nALL CHECKS PASSED" : `\n${failed} CHECK(S) FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

