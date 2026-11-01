import { NextRequest } from "next/server";
import { products, productReviews, users } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { serializeReview } from "@/lib/serialize";
import { ok, created, error, notFound, serverError } from "@/lib/response";

/**
 * «دیدگاه‌ها» of one product (accepts its id **or** slug).
 * GET  — public: approved reviews + { count, average } summary.
 * POST — signed-in customers only; the review is stored as PENDING and shows up
 *        on the product page once an admin approves it in /admin/reviews.
 */

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const product = products.findById(id);
    if (!product) return notFound("محصول یافت نشد");
    return ok({
      reviews: productReviews.listApproved(product.id).map(serializeReview),
      summary: productReviews.summary(product.id),
    });
  } catch (e) { console.error(e); return serverError(); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req);
    if ("error" in auth) return error(auth.error, auth.status);

    const { id } = await params;
    const product = products.findById(id);
    if (!product) return notFound("محصول یافت نشد");

    const body = await req.json();
    const rating = parseInt(String(body.rating ?? "5"), 10);
    const text = String(body.body ?? "").trim();
    if (Number.isNaN(rating) || rating < 1 || rating > 5) return error("امتیاز را بین ۱ تا ۵ انتخاب کنید");
    if (text.length < 5) return error("متن دیدگاه را کامل‌تر بنویسید");

    const existing = productReviews.findMine(product.id, auth.user.userId);
    if (existing) return error("شما قبلاً برای این محصول دیدگاه ثبت کرده‌اید", 409);

    const user = users.findById(auth.user.userId);
    const review = productReviews.create({
      productId: product.id,
      userId: auth.user.userId,
      name: user?.name?.trim() || "کاربر خانوم جون",
      rating,
      body: text,
    });

    return created({ review: serializeReview(review), pending: true });
  } catch (e) { console.error(e); return serverError(); }
}
