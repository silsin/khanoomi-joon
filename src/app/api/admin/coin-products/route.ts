import { NextRequest } from "next/server";
import { products, categories } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { serializeProduct } from "@/lib/serialize";
import { ok, created, error, serverError } from "@/lib/response";

/**
 * «سکه و آبشده» admin API — coin/melted-gold products live in the main
 * `products` table with coin=1 so they also appear in the shop. This route
 * only lists/creates them; edits and deletes go through /api/products/[id].
 */

const COIN_CATEGORY_SLUG = "coin-melted";

/** Auto-provisioned category for سکه و آبشده products. */
function coinCategoryId(): string {
  const existing = categories.findBySlug(COIN_CATEGORY_SLUG);
  if (existing) return existing.id;
  return categories.create({
    name: "سکه و آبشده",
    slug: COIN_CATEGORY_SLUG,
    description: "سکه، طلای گرمی و آبشده",
  }).id;
}

export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);
    const rows = products.list({ coin: true, limit: 500, adminMode: true }).rows;
    return ok({ products: rows.map(serializeProduct) });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);

    const body = await req.json();
    const { name, weight, karat, stock, image, price, profit } = body;

    if (!name?.trim()) return error("نام محصول الزامی است");
    const w = parseFloat(weight);
    if (!w || w <= 0) return error("وزن نامعتبر است");
    const p = Math.round(parseFloat(price));
    if (!p || p <= 0) return error("قیمت پایه نامعتبر است — قیمت لحظه‌ای طلا در دسترس نیست");

    const created_row = products.create({
      id: "",
      name: name.trim(),
      slug: `coin-${Date.now()}`,
      description: null,
      price: p,
      weight: w,
      karat: parseInt(karat ?? 18) || 18,
      stock: parseInt(stock ?? 0) || 0,
      images: JSON.stringify(image ? [image] : []),
      videos: "[]",
      featured: 0,
      published: 1,
      express_shipping: 0,
      low_wage: 0,
      coin: 1,
      new_arrival: 0,
      category_id: coinCategoryId(),
      // Profit % is applied on top of the base gold price via the اجرت machinery.
      ajrat_override: 1,
      ajrat_percent: profit !== undefined && profit !== "" ? parseFloat(profit) : 0,
      ajrat_fixed: 0,
      // Coins follow the gold rate by default (their base is derived from it
      // anyway) — the admin can lock one from the product form if needed.
      fixed_price: 0,
      variants: "[]",
      specs: "[]",
    });

    return created(serializeProduct(created_row));
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
