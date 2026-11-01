import { NextRequest } from "next/server";
import { products } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { serializeProduct } from "@/lib/serialize";
import { normalizeVariants, normalizeSpecs, serializeVariants, serializeSpecs } from "@/lib/product-variants";
import { ok, created, error, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "12"));
    const adminMode = searchParams.get("adminMode") === "true";
    const result = products.list({
      categoryId: searchParams.get("category") || undefined,
      featured: searchParams.get("featured") === "true" ? true : undefined,
      express: searchParams.get("express") === "true" ? true : undefined,
      lowWage: searchParams.get("lowWage") === "true" ? true : undefined,
      coin: searchParams.get("coin") === "true" ? true : undefined,
      newArrival: searchParams.get("new") === "true" ? true : undefined,
      discount: searchParams.get("discount") === "true" ? true : undefined,
      search: searchParams.get("search") || undefined,
      limit, offset: (page - 1) * limit,
      adminMode,
    });
    return ok({
      products: adminMode ? result.rows.map(serializeProduct) : result.rows,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  } catch (e) { console.error(e); return serverError(); }
}

export async function POST(req: NextRequest) {
  try {
    const result = requireAdmin(req);
    if ("error" in result) return error(result.error, result.status);
    const body = await req.json();
    const { name, slug, description, price, weight, karat, stock, images, videos, categoryId, featured, published, express_shipping, low_wage, coin, new_arrival, ajrat_override, ajrat_percent, ajrat_fixed, fixed_price, variants, specs } = body;
    if (!name?.trim()) return error("نام محصول الزامی است");
    if (!slug?.trim()) return error("اسلاگ الزامی است");
    if (!price || price <= 0) return error("قیمت نامعتبر است");
    if (!weight || weight <= 0) return error("وزن نامعتبر است");
    if (!categoryId) return error("دسته‌بندی الزامی است");
    if (products.countBySlug(slug) > 0) return error("این اسلاگ قبلاً استفاده شده", 409);
    return created(products.create({
      id: "", name: name.trim(), slug: slug.trim(), description: description ?? null,
      price: parseFloat(price), weight: parseFloat(weight), karat: parseInt(karat ?? 18),
      stock: parseInt(stock ?? 0), images: JSON.stringify(images ?? []),
      videos: JSON.stringify(videos ?? []),
      featured: featured ? 1 : 0, published: published !== false ? 1 : 0,
      express_shipping: express_shipping ? 1 : 0,
      low_wage: low_wage ? 1 : 0,
      coin: coin ? 1 : 0,
      new_arrival: new_arrival ? 1 : 0,
      category_id: categoryId,
      ajrat_override: ajrat_override ? 1 : 0,
      ajrat_percent: ajrat_override && ajrat_percent !== undefined ? parseFloat(ajrat_percent) : null,
      ajrat_fixed: ajrat_override && ajrat_fixed !== undefined ? parseFloat(ajrat_fixed) : null,
      fixed_price: fixed_price ? 1 : 0,
      variants: serializeVariants(normalizeVariants(variants)),
      specs: serializeSpecs(normalizeSpecs(specs)),
    }));
  } catch (e) { console.error(e); return serverError(); }
}
