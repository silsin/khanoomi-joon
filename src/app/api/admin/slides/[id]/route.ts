import { NextRequest } from "next/server";
import { heroSlides } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, error, notFound, serverError } from "@/lib/response";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    const allowed = ["sort_order","tag","title1","title2","title3","subtitle","cta_label","cta_href","cta2_label","cta2_href","cta3_label","cta3_href","content_position","image_fit","image","bg_color","accent","active"];
    for (const k of allowed) {
      if (body[k] !== undefined) data[k] = k === "active" ? (body[k] ? 1 : 0) : body[k];
    }
    const slide = heroSlides.update(id, data);
    return slide ? ok(slide) : notFound("اسلاید یافت نشد");
  } catch (e) { console.error(e); return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);
    const { id } = await params;
    heroSlides.delete(id);
    return ok({ deleted: true });
  } catch (e) { console.error(e); return serverError(); }
}
