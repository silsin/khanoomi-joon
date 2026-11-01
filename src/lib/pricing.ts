/**
 * Shared pricing helpers — used on both server (API) and client (components)
 *
 * Two layers:
 *   1. قیمت پایه (base)  — either the stored product price, or — when live
 *                         pricing is on and the product is not locked — derived
 *                         from the current gold rate: gram × weight × (karat/18).
 *   2. اجرت + مالیات     — the shop's wage/profit and tax on top of that base.
 */

export interface AjratSettings {
  gold_markup_percent: string;
  gold_fixed_fee: string;
  /**
   * Tax % charged on the اجرت (wage + profit) part only — the gold-trade rule
   * «مالیات تنها بر روی سود و اجرت اخذ می‌گردد». Optional: when missing/0 the
   * result is identical to the pre-tax formula.
   */
  gold_tax_percent?: string;
  /**
   * «قیمت‌گذاری خودکار» master switch (Admin → تنظیمات → قیمت‌گذاری).
   * "1" = derive every unlocked product's base from the live gold rate.
   */
  live_pricing_enabled?: string;
  /**
   * Current 18k gram rate in **Toman**, written by the gold-price poller on
   * every successful read. Empty/0 = no live rate available → the stored price
   * is used (the site never shows a broken price).
   */
  gold_live_rate?: string;
}

export interface ProductPricingInput {
  price: number;          // base price (total, not per-gram)
  weight: number;         // grams
  karat?: number;         // 18 / 21 / 24 — used to derive a live base
  ajrat_override: number; // 1 = use product-specific values
  ajrat_percent: number | null;
  ajrat_fixed: number | null;
  /** 1 = «قیمت ثابت» — this product keeps its stored base and ignores gold. */
  fixed_price?: number;
}

export interface PricingResult {
  ajrat: number;
  tax: number;
  taxPct: number;
  /** The base actually used (live-derived or the stored price). */
  basePrice: number;
  finalPrice: number;
  markupPct: number;
  fixedFee: number;
  isOverride: boolean;
  /** True when the base was derived from the live gold rate. */
  isLive: boolean;
  /** The rate used, when live. */
  liveRate: number;
  karat: number;
  /** True when live pricing is on but this product is locked to a fixed price. */
  isLocked: boolean;
}

function isLivePricingOn(settings: AjratSettings): boolean {
  const v = settings.live_pricing_enabled;
  return v === "1" || v === "true";
}

/**
 * The base every other charge is calculated on.
 *
 * Live pricing (Admin → تنظیمات → «قیمت‌گذاری خودکار») re-derives the base from
 * the current gold rate on every page view, so a product follows the market
 * instead of keeping whatever it was saved with. A product marked «قیمت ثابت»
 * always keeps its stored base, and if no live rate is available the stored
 * price is used rather than a wrong number.
 */
export function calcEffectiveBase(
  product: ProductPricingInput,
  settings: AjratSettings
): { basePrice: number; isLive: boolean; liveRate: number; karat: number; isLocked: boolean } {
  const karat = product.karat && product.karat > 0 ? product.karat : 18;
  const isLocked = product.fixed_price === 1;
  const liveRate = parseFloat(settings.gold_live_rate || "") || 0;

  const canBeLive =
    isLivePricingOn(settings) && !isLocked && liveRate > 0 && product.weight > 0;

  const basePrice = canBeLive
    ? Math.round(liveRate * product.weight * (karat / 18))
    : product.price;

  return { basePrice, isLive: canBeLive, liveRate, karat, isLocked };
}

/**
 * Calculate the اجرت (wage/fee) amount for a product.
 * Formula:
 *   base  = live gold × weight × (karat/18)  — when live pricing applies,
 *           otherwise the product's stored price
 *   ajrat = base × (markupPct / 100) + fixedFeePerGram × weight
 *   tax   = ajrat × (taxPct / 100)          — only when gold_tax_percent > 0
 *
 * Returns the final price = base + ajrat + tax.
 */
export function calcFinalPrice(
  product: ProductPricingInput,
  globalSettings: AjratSettings
): PricingResult {
  const isOverride = product.ajrat_override === 1;

  const markupPct = isOverride && product.ajrat_percent !== null
    ? product.ajrat_percent
    : parseFloat(globalSettings.gold_markup_percent) || 0;

  const fixedFee = isOverride && product.ajrat_fixed !== null
    ? product.ajrat_fixed
    : parseFloat(globalSettings.gold_fixed_fee) || 0;

  const taxPct = parseFloat(globalSettings.gold_tax_percent ?? "") || 0;

  const { basePrice, isLive, liveRate, karat, isLocked } = calcEffectiveBase(product, globalSettings);

  const ajrat = Math.round(basePrice * (markupPct / 100) + fixedFee * product.weight);
  const tax = taxPct > 0 ? Math.round(ajrat * (taxPct / 100)) : 0;
  const finalPrice = basePrice + ajrat + tax;

  return {
    ajrat,
    tax,
    taxPct,
    basePrice,
    finalPrice,
    markupPct,
    fixedFee,
    isOverride,
    isLive,
    liveRate,
    karat,
    isLocked,
  };
}
