import { NextRequest } from "next/server";
import { promoBanners } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, error, notFound, serverError } from "@/lib/response";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    const allowed = ["title", "sub", "href", "image", "theme", "sort_order", "active"];
    for (const k of allowed) {
      if (body[k] === undefined) continue;
      if (k === "active") data[k] = body[k] ? 1 : 0;
      else if (k === "theme") data[k] = body[k] === "light" ? "light" : "dark";
      else data[k] = body[k];
    }
    const banner = promoBanners.update(id, data);
    return banner ? ok(banner) : notFound("بنر یافت نشد");
  } catch (e) { console.error(e); return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);
    const { id } = await params;
    if (!promoBanners.findById(id)) return notFound("بنر یافت نشد");
    promoBanners.delete(id);
    return ok({ deleted: true });
  } catch (e) { console.error(e); return serverError(); }
}
