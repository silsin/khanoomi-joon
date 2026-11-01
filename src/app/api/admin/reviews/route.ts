import { NextRequest } from "next/server";
import { productReviews } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { serializeReview } from "@/lib/serialize";
import { ok, error, serverError } from "@/lib/response";

const STATUSES = ["PENDING", "APPROVED", "REJECTED"];

/** «دیدگاه‌ها» moderation list — /api/admin/reviews?status=PENDING&page=1 */
export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") ?? "";
    const status = STATUSES.includes(statusParam) ? statusParam : undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));

    const result = productReviews.listForAdmin({ status, limit, offset: (page - 1) * limit });
    return ok({
      reviews: result.rows.map(serializeReview),
      counts: {
        all: productReviews.countByStatus("PENDING") + productReviews.countByStatus("APPROVED") + productReviews.countByStatus("REJECTED"),
        pending: productReviews.countByStatus("PENDING"),
        approved: productReviews.countByStatus("APPROVED"),
        rejected: productReviews.countByStatus("REJECTED"),
      },
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  } catch (e) { console.error(e); return serverError(); }
}
