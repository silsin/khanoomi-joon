import { NextResponse } from "next/server";
import { COOKIE_CONFIG } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true, data: null });
  response.cookies.set(COOKIE_CONFIG.name, "", { ...COOKIE_CONFIG, maxAge: 0 });
  return response;
}
