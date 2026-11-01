/**
 * CORS for the trading PWA.
 *
 * The Vue PWA is deployed as its own app on its own origin, so it calls this
 * site's API cross-origin. Authentication is a Bearer token in the
 * `Authorization` header (not cookies), which is what keeps this simple:
 * `Access-Control-Allow-Credentials` stays off and the allow-list is exact.
 *
 * Allowed origins come from `TRADE_CORS_ORIGINS` (comma separated). When unset
 * the API is open to any origin — fine for a read-only price feed on a private
 * deployment, so set the variable before going public.
 */
import { NextRequest, NextResponse } from "next/server";

function allowedOrigins(): string[] {
  const raw = (process.env.TRADE_CORS_ORIGINS ?? "").trim();
  if (!raw) return ["*"];
  return raw
    .split(",")
    .map(s => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function originOf(req: NextRequest): string | null {
  return req.headers.get("origin");
}

function resolveAllowOrigin(req: NextRequest): string {
  const list = allowedOrigins();
  if (list.includes("*")) return "*";
  const origin = originOf(req);
  if (origin && list.includes(origin.replace(/\/+$/, ""))) return origin;
  return list[0] ?? "*";
}

/** Headers every trading response carries (including error responses). */
export function corsHeaders(req: NextRequest): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveAllowOrigin(req),
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** Preflight — Next routes must answer OPTIONS themselves. */
export function corsPreflight(req: NextRequest): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

/** Attach CORS headers to an already-built response. */
export function withCors(req: NextRequest, res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(corsHeaders(req))) {
    res.headers.set(key, value);
  }
  return res;
}
