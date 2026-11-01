import { NextRequest } from "next/server";
import { categories } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { serializeCategory } from "@/lib/serialize";
import { ok, created, error, serverError } from "@/lib/response";

export async function GET() {
  try {
    return ok(categories.list().map(serializeCategory));
  } catch (e) { console.error(e); return serverError(); }
}

export async function POST(req: NextRequest) {
  try {
    const result = requireAdmin(req);
    if ("error" in result) return error(result.error, result.status);
    const { name, slug, description, image, parent_id } = await req.json();
    if (!name?.trim()) return error("نام دسته‌بندی الزامی است");
    if (!slug?.trim()) return error("اسلاگ الزامی است");
    if (categories.findBySlug(slug)) return error("این اسلاگ قبلاً استفاده شده", 409);
    if (parent_id && !categories.findById(parent_id)) return error("دسته‌بندی مادر یافت نشد");
    return created(
      categories.create({
        name: name.trim(),
        slug: slug.trim(),
        description,
        image,
        parent_id: parent_id || null,
      })
    );
  } catch (e) { console.error(e); return serverError(); }
}
