import { NextRequest } from "next/server";
import { specialOffers } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, error, notFound, serverError } from "@/lib/response";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.discount_percent !== undefined) {
      const discount = parseFloat(body.discount_percent);
      if (Number.isNaN(discount) || discount < 0 || discount > 90) return error("درصد تخفیف باید بین 0 تا 90 باشد");
      data.discount_percent = discount;
    }
    if (body.sort_order !== undefined) data.sort_order = parseInt(body.sort_order) || 0;
    if (body.active !== undefined) data.active = body.active ? 1 : 0;
    const offer = specialOffers.update(id, data);
    return offer ? ok(offer) : notFound("پیشنهاد یافت نشد");
  } catch (e) { console.error(e); return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);
    const { id } = await params;
    specialOffers.delete(id);
    return ok({ deleted: true });
  } catch (e) { console.error(e); return serverError(); }
}
