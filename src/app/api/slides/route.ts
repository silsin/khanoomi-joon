import { NextRequest } from "next/server";
import { heroSlides } from "@/lib/db";
import { ok, serverError } from "@/lib/response";

// Public — returns only active slides for the frontend
export async function GET(_req: NextRequest) {
  try {
    return ok(heroSlides.listActive());
  } catch (e) { console.error(e); return serverError(); }
}
