import { NextRequest } from "next/server";
import { categories } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, error, notFound, serverError } from "@/lib/response";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cat = categories.findById(id);
    return cat ? ok(cat) : notFound();
  } catch (e) { console.error(e); return serverError(); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = requireAdmin(req);
    if ("error" in result) return error(result.error, result.status);
    const { id } = await params;
    const data = await req.json();

    // Guard the tree: a category may not be nested under itself or under one
    // of its own descendants.
    if (data.parent_id) {
      if (data.parent_id === id) return error("یک دسته‌بندی نمی‌تواند زیرمجموعه خودش باشد");
      if (categories.descendantIds(id).includes(data.parent_id)) {
        return error("انتخاب نامعتبر است — این دسته‌بندی زیرمجموعه همان دسته است");
      }
      if (!categories.findById(data.parent_id)) return error("دسته‌بندی مادر یافت نشد");
    }
    return ok(categories.update(id, data));
  } catch (e) { console.error(e); return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = requireAdmin(req);
    if ("error" in result) return error(result.error, result.status);
    const { id } = await params;
    const cat = categories.findById(id);
    if (!cat) return notFound();
    const productCount = categories.countProducts(id);
    if (productCount > 0) {
      return error(`این دسته‌بندی دارای ${productCount} محصول است. ابتدا محصولات را منتقل یا حذف کنید.`, 409);
    }
    categories.delete(id);
    return ok({ deleted: true });
  } catch (e) { console.error(e); return serverError(); }
}
