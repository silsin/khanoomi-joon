import { NextRequest } from "next/server";
import { heroSlides } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, error, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);
    return ok(heroSlides.list());
  } catch (e) { console.error(e); return serverError(); }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);
    const body = await req.json();
    if (!body.image?.trim()) return error("تصویر اسلاید الزامی است");
    const slide = heroSlides.create({
      sort_order:        body.sort_order        ?? 0,
      tag:               body.tag               ?? "",
      title1:            body.title1            ?? "",
      title2:            body.title2            ?? "",
      title3:            body.title3            ?? "",
      subtitle:          body.subtitle          ?? "",
      cta_label:         body.cta_label         ?? "",
      cta_href:          body.cta_href          ?? "/products",
      cta2_label:        body.cta2_label        ?? "",
      cta2_href:         body.cta2_href         ?? "",
      cta3_label:        body.cta3_label        ?? "",
      cta3_href:         body.cta3_href         ?? "",
      content_position:  body.content_position  ?? "right",
      image_fit:         body.image_fit         ?? "cover",
      image:             body.image,
      bg_color:          body.bg_color          ?? "#f2ebe0",
      accent:            body.accent            ?? "#c8a12a",
      active:            body.active !== false ? 1 : 0,
    });
    return ok(slide, 201);
  } catch (e) { console.error(e); return serverError(); }
}
