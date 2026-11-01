import { NextRequest } from "next/server";
import { promoBanners } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, error, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);
    return ok(promoBanners.list());
  } catch (e) { console.error(e); return serverError(); }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);
    const body = await req.json();
    if (!body.title?.trim()) return error("عنوان بنر الزامی است");
    const banner = promoBanners.create({
      title:      body.title.trim(),
      sub:        body.sub        ?? "",
      href:       body.href       ?? "/products",
      image:      body.image      ?? "",
      theme:      body.theme === "light" ? "light" : "dark",
      sort_order: body.sort_order ?? 0,
      active:     body.active !== false ? 1 : 0,
    });
    return ok(banner, 201);
  } catch (e) { console.error(e); return serverError(); }
}
