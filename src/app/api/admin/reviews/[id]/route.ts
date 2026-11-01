import { NextRequest } from "next/server";
import { productReviews } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, error, notFound, serverError } from "@/lib/response";

/** Approve / reject one review: PUT { status: "APPROVED" | "REJECTED" | "PENDING" } */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);

    const { id } = await params;
    const body = await req.json();
    const status = String(body.status ?? "");
    if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) return error("وضعیت نامعتبر است");

    const review = productReviews.setStatus(id, status);
    return review ? ok(review) : notFound("دیدگاه یافت نشد");
  } catch (e) { console.error(e); return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);

    const { id } = await params;
    productReviews.delete(id);
    return ok({ deleted: true });
  } catch (e) { console.error(e); return serverError(); }
}
