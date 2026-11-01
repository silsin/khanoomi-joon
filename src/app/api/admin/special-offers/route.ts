import { NextRequest } from "next/server";
import { specialOffers, products } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, error, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);
    const offers = specialOffers.listWithProduct();
    // Lightweight product list for the picker (all statuses shown in admin)
    const all = products.list({ adminMode: true, limit: 500 });
    const picker = all.rows.map(p => ({ id: p.id, name: p.name, slug: p.slug, published: p.published, stock: p.stock }));
    return ok({ offers, products: picker });
  } catch (e) { console.error(e); return serverError(); }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);
    const body = await req.json();
    const productId = body.product_id ?? body.productId;
    if (!productId?.trim()) return error("انتخاب محصول الزامی است");
    const product = products.findById(productId);
    if (!product) return error("محصول یافت نشد", 404);
    if (specialOffers.countByProductId(productId) > 0) return error("این محصول قبلاً به پیشنهادها اضافه شده", 409);
    const discount = parseFloat(body.discount_percent ?? 0);
    if (Number.isNaN(discount) || discount < 0 || discount > 90) return error("درصد تخفیف باید بین 0 تا 90 باشد");
    const offer = specialOffers.create({
      product_id: productId,
      discount_percent: discount,
      sort_order: parseInt(body.sort_order) || 0,
      active: body.active !== false ? 1 : 0,
    });
    return ok(offer, 201);
  } catch (e) { console.error(e); return serverError(); }
}
