import { NextRequest } from "next/server";
import { orders, products as productsDb } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { serializeOrder, serializeOrderDetail } from "@/lib/serialize";
import { parseVariants } from "@/lib/product-variants";
import { validateOrderShipping } from "@/lib/order-shipping";
import { ok, created, error, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if ("error" in authResult) return error(authResult.error, authResult.status);
    const adminResult = requireAdmin(req);
    const isAdmin = !("error" in adminResult);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
    const result = orders.list({ userId: isAdmin ? undefined : authResult.user.userId, limit, offset: (page - 1) * limit });
    return ok({
      orders: result.rows.map(serializeOrder),
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  } catch (e) { console.error(e); return serverError(); }
}

export async function POST(req: NextRequest) {
  try {
    const result = requireAuth(req);
    if ("error" in result) return error(result.error, result.status);
    const body = await req.json();
    const { items } = body;
    if (!items?.length) return error("سبد خرید خالی است");

    const shippingResult = validateOrderShipping(body);
    if (!shippingResult.ok) return error(shippingResult.error);
    const shipping = shippingResult.data;

    let total = 0;
    const orderItems: {
      productId: string;
      quantity: number;
      price: number;
      variantWeight?: number | null;
      giftPack?: string | null;
      postcard?: string | null;
    }[] = [];
    for (const item of items) {
      const product = productsDb.findById(item.productId);
      if (!product) return error(`محصول یافت نشد`);
      if (product.published !== 1) return error(`محصول در دسترس نیست`);

      // Weight variants: the chosen weight carries its own price and stock.
      const variants = parseVariants(product.variants);
      const requestedWeight =
        item.variantWeight !== undefined && item.variantWeight !== null
          ? Number(item.variantWeight)
          : null;
      let unitPrice = product.price;
      let available = product.stock;
      let variantWeight: number | null = null;
      if (variants.length > 0) {
        const variant = variants.find(v => v.weight === requestedWeight) ?? variants[0];
        unitPrice = variant.price;
        available = variant.stock;
        variantWeight = variant.weight;
      }

      if (available < item.quantity) return error(`موجودی ${product.name} کافی نیست`);
      total += unitPrice * item.quantity;
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: unitPrice,
        variantWeight,
        giftPack: item.giftPack ? String(item.giftPack).slice(0, 60) : null,
        postcard: item.postcard ? String(item.postcard).slice(0, 60) : null,
      });
    }
    const order = orders.create({
      userId: result.user.userId,
      total,
      address: shipping.address,
      note: shipping.note,
      recipientFirstName: shipping.recipient_first_name,
      recipientLastName: shipping.recipient_last_name,
      recipientPhone: shipping.recipient_phone,
      recipientEmail: shipping.recipient_email,
      province: shipping.province,
      county: shipping.county,
      postalCode: shipping.postal_code,
      deliveryPhone: shipping.delivery_phone,
      items: orderItems,
    });
    return created(serializeOrderDetail(order));
  } catch (e) { console.error(e); return serverError(); }
}
