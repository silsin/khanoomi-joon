import { NextRequest } from "next/server";
import { products, specialOffers } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { normalizeVariants, normalizeSpecs, serializeVariants, serializeSpecs } from "@/lib/product-variants";
import { ok, error, notFound, serverError } from "@/lib/response";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const p = products.findById(id);
    return p ? ok(p) : notFound("محصول یافت نشد");
  } catch (e) { console.error(e); return serverError(); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = requireAdmin(req);
    if ("error" in result) return error(result.error, result.status);
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.description !== undefined) data.description = body.description;
    if (body.price !== undefined) data.price = parseFloat(body.price);
    if (body.weight !== undefined) data.weight = parseFloat(body.weight);
    if (body.karat !== undefined) data.karat = parseInt(body.karat);
    if (body.stock !== undefined) data.stock = parseInt(body.stock);
    if (body.images !== undefined) data.images = JSON.stringify(body.images);
    if (body.videos !== undefined) data.videos = JSON.stringify(body.videos);
    if (body.categoryId !== undefined) data.category_id = body.categoryId;
    if (body.featured !== undefined) data.featured = body.featured ? 1 : 0;
    if (body.published !== undefined) data.published = body.published ? 1 : 0;
    if (body.express_shipping !== undefined) data.express_shipping = body.express_shipping ? 1 : 0;
    if (body.low_wage !== undefined) data.low_wage = body.low_wage ? 1 : 0;
    if (body.coin !== undefined) data.coin = body.coin ? 1 : 0;
    if (body.new_arrival !== undefined) data.new_arrival = body.new_arrival ? 1 : 0;
    if (body.ajrat_override !== undefined) data.ajrat_override = body.ajrat_override ? 1 : 0;
    if (body.ajrat_percent !== undefined) data.ajrat_percent = body.ajrat_percent !== null && body.ajrat_percent !== "" ? parseFloat(body.ajrat_percent) : null;
    if (body.ajrat_fixed !== undefined) data.ajrat_fixed = body.ajrat_fixed !== null && body.ajrat_fixed !== "" ? parseFloat(body.ajrat_fixed) : null;
    if (body.fixed_price !== undefined) data.fixed_price = body.fixed_price ? 1 : 0;
    if (body.variants !== undefined) data.variants = serializeVariants(normalizeVariants(body.variants));
    if (body.specs !== undefined) data.specs = serializeSpecs(normalizeSpecs(body.specs));
    return ok(products.update(id, data));
  } catch (e) { console.error(e); return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = requireAdmin(req);
    if ("error" in result) return error(result.error, result.status);
    const { id } = await params;
    // Delete the product first: wishlist_items and special_offers cascade, and if
    // anything else rejects the delete we must not have already removed its offer
    // rows. The explicit offer sweep afterwards also covers databases created
    // before special_offers had its ON DELETE CASCADE.
    products.delete(id);
    specialOffers.deleteByProductId(id);
    return ok({ deleted: true });
  } catch (e) { console.error(e); return serverError(); }
}
