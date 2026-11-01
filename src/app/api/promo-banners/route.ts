import { promoBanners } from "@/lib/db";
import { ok, serverError } from "@/lib/response";

// Public — active promo banners for the homepage
export async function GET() {
  try {
    return ok(promoBanners.listActive());
  } catch (e) { console.error(e); return serverError(); }
}
