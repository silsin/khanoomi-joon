export type PriceBarAlign = "right" | "center" | "left";

export type PriceBarPartId = "label" | "gold" | "amount" | "currency";

export const PRICE_BAR_PART_IDS: PriceBarPartId[] = ["label", "gold", "amount", "currency"];

export const DEFAULT_PRICE_BAR_PART_ORDER: PriceBarPartId[] = [...PRICE_BAR_PART_IDS];

export const PRICE_BAR_PART_LABELS: Record<PriceBarPartId, string> = {
  label: "متن اول",
  gold: "متن دوم",
  amount: "عدد قیمت",
  currency: "متن واحد",
};

export interface PriceBarStyle {
  labelText: string;
  labelColor: string;
  goldText: string;
  goldColor: string;
  amountColor: string;
  currencyText: string;
  currencyColor: string;
  align: PriceBarAlign;
  partOrder: PriceBarPartId[];
  fontId: string;
  fontSize: number;
}

export const PRICE_BAR_ALIGN_OPTIONS: { id: PriceBarAlign; label: string }[] = [
  { id: "right", label: "راست" },
  { id: "center", label: "وسط" },
  { id: "left", label: "چپ" },
];

export const DEFAULT_PRICE_BAR_STYLE: PriceBarStyle = {
  labelText: "قیمت",
  labelColor: "#ffffff",
  goldText: "طلا",
  goldColor: "#f0c040",
  amountColor: "#f0c040",
  currencyText: "تومان",
  currencyColor: "#f0c040",
  align: "center",
  partOrder: DEFAULT_PRICE_BAR_PART_ORDER,
  fontId: "Vazirmatn",
  fontSize: 12,
};

export const PRICE_BAR_FONT_SIZE_MIN = 8;
export const PRICE_BAR_FONT_SIZE_MAX = 200;

export function clampPriceBarFontSize(value: unknown): number {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (Number.isNaN(n)) return DEFAULT_PRICE_BAR_STYLE.fontSize;
  return Math.min(PRICE_BAR_FONT_SIZE_MAX, Math.max(PRICE_BAR_FONT_SIZE_MIN, Math.round(n)));
}

function parseAlign(value: string | undefined): PriceBarAlign {
  if (value === "right" || value === "left" || value === "center") return value;
  return DEFAULT_PRICE_BAR_STYLE.align;
}

export function parsePriceBarPartOrder(raw: string | undefined): PriceBarPartId[] {
  if (!raw?.trim()) return DEFAULT_PRICE_BAR_PART_ORDER;

  let parts: string[] = [];
  if (raw.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) parts = parsed.map(String);
    } catch {
      return DEFAULT_PRICE_BAR_PART_ORDER;
    }
  } else {
    parts = raw.split(",").map(s => s.trim()).filter(Boolean);
  }

  if (
    parts.length === PRICE_BAR_PART_IDS.length &&
    new Set(parts).size === PRICE_BAR_PART_IDS.length &&
    parts.every(p => PRICE_BAR_PART_IDS.includes(p as PriceBarPartId))
  ) {
    return parts as PriceBarPartId[];
  }

  return DEFAULT_PRICE_BAR_PART_ORDER;
}

/** Horizontal placement of price bar content on RTL pages. */
export function priceBarJustifyContent(align: PriceBarAlign): "flex-start" | "center" | "flex-end" {
  switch (align) {
    case "right":
      return "flex-start";
    case "left":
      return "flex-end";
    default:
      return "center";
  }
}

export function movePriceBarPartOrder(
  order: PriceBarPartId[],
  index: number,
  direction: -1 | 1,
): PriceBarPartId[] {
  const next = [...order];
  const target = index + direction;
  if (target < 0 || target >= next.length) return order;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function parsePriceBarStyle(data: Record<string, string | undefined>): PriceBarStyle {
  return {
    labelText: data.price_bar_label_text?.trim() || DEFAULT_PRICE_BAR_STYLE.labelText,
    labelColor: data.price_bar_label_color?.trim() || DEFAULT_PRICE_BAR_STYLE.labelColor,
    goldText: data.price_bar_gold_text?.trim() || DEFAULT_PRICE_BAR_STYLE.goldText,
    goldColor: data.price_bar_gold_color?.trim() || DEFAULT_PRICE_BAR_STYLE.goldColor,
    amountColor: data.price_bar_amount_color?.trim() || DEFAULT_PRICE_BAR_STYLE.amountColor,
    currencyText: data.price_bar_currency_text?.trim() || DEFAULT_PRICE_BAR_STYLE.currencyText,
    currencyColor: data.price_bar_currency_color?.trim() || DEFAULT_PRICE_BAR_STYLE.currencyColor,
    align: parseAlign(data.price_bar_align),
    partOrder: parsePriceBarPartOrder(data.price_bar_part_order),
    fontId: data.price_bar_font_id?.trim() || DEFAULT_PRICE_BAR_STYLE.fontId,
    fontSize: clampPriceBarFontSize(data.price_bar_font_size),
  };
}

export function priceBarStyleToSettings(style: PriceBarStyle): Record<string, string> {
  return {
    price_bar_label_text: style.labelText,
    price_bar_label_color: style.labelColor,
    price_bar_gold_text: style.goldText,
    price_bar_gold_color: style.goldColor,
    price_bar_amount_color: style.amountColor,
    price_bar_currency_text: style.currencyText,
    price_bar_currency_color: style.currencyColor,
    price_bar_align: style.align,
    price_bar_part_order: style.partOrder.join(","),
    price_bar_font_id: style.fontId,
    price_bar_font_size: String(clampPriceBarFontSize(style.fontSize)),
  };
}
