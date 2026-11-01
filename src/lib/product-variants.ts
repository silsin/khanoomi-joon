/**
 * Product variants (weight choices) and the «خصوصیات محصولات طلا» spec rows.
 * Both are stored as JSON text columns on the product row (`variants`, `specs`)
 * and exposed as arrays by serializeProduct, so the admin form and the
 * storefront share one shape. Mirrors the media.ts approach for JSON columns.
 */

export interface ProductVariant {
  id: string;
  /** Grams. */
  weight: number;
  /** Base gold value for this weight (before اجرت/سود/مالیات). */
  price: number;
  stock: number;
}

export interface ProductSpec {
  label: string;
  value: string;
}

/** Parse the `variants` column — never throws, drops malformed rows. */
export function parseVariants(raw: string | null | undefined): ProductVariant[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, i) => {
        if (!item || typeof item !== "object") return null;
        const o = item as Record<string, unknown>;
        const weight = Number(o.weight);
        const price = Number(o.price);
        if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(price) || price <= 0) return null;
        const stock = Number(o.stock);
        return {
          id: String(o.id ?? `v${i}`) || `v${i}`,
          weight,
          price: Math.round(price),
          stock: Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : 0,
        };
      })
      .filter((v): v is ProductVariant => !!v);
  } catch {
    return [];
  }
}

/** Normalize a variants array coming from the admin form before storing it. */
export function normalizeVariants(input: unknown): ProductVariant[] {
  return parseVariants(JSON.stringify(Array.isArray(input) ? input : []));
}

export function serializeVariants(list: ProductVariant[]): string {
  return JSON.stringify(list.map(v => ({ id: v.id, weight: v.weight, price: v.price, stock: v.stock })));
}

/** Parse the `specs` column — never throws, drops empty rows. */
export function parseSpecs(raw: string | null | undefined): ProductSpec[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(item => {
        if (!item || typeof item !== "object") return null;
        const o = item as Record<string, unknown>;
        const label = String(o.label ?? "").trim();
        const value = String(o.value ?? "").trim();
        return label && value ? { label, value } : null;
      })
      .filter((s): s is ProductSpec => !!s);
  } catch {
    return [];
  }
}

/** Normalize a specs array coming from the admin form before storing it. */
export function normalizeSpecs(input: unknown): ProductSpec[] {
  return parseSpecs(JSON.stringify(Array.isArray(input) ? input : []));
}

export function serializeSpecs(list: ProductSpec[]): string {
  return JSON.stringify(list.map(s => ({ label: s.label, value: s.value })));
}

/** «۱۸ عیار (۷۵۰)» style label for a karat value. */
export function karatLabel(karat: number): string {
  if (karat === 24) return "24 عیار (999)";
  if (karat === 18) return "18 عیار (750)";
  return `${karat} عیار`;
}

/**
 * Rows shown in the «خصوصیات محصولات طلا» table when an admin has not entered
 * custom specs — keeps the table populated out of the box.
 */
export function buildDefaultSpecs(opts: {
  karat: number;
  weight: number;
  categoryName?: string | null;
  packaging: string;
}): ProductSpec[] {
  return [
    { label: "بسته بندی", value: opts.packaging },
    { label: "عیار طلا", value: karatLabel(opts.karat) },
    { label: "وزن", value: `${opts.weight} گرم` },
    { label: "جنس", value: "طلای اصل" },
    { label: "رنگ طلا", value: "زرد براق" },
    { label: "دسته بندی", value: opts.categoryName || "—" },
    { label: "ارسال", value: "ارسال به سراسر ایران" },
    { label: "گارانتی", value: "ضمانت اصالت + فاکتور معتبر" },
  ];
}

/** Total stock across variants (falls back to the product stock). */
export function variantsStock(list: ProductVariant[]): number {
  return list.reduce((sum, v) => sum + v.stock, 0);
}
