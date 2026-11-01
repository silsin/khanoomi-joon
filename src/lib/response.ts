import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function error(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function notFound(message = "یافت نشد") {
  return error(message, 404);
}

export function unauthorized(message = "احراز هویت الزامی است") {
  return error(message, 401);
}

export function forbidden(message = "دسترسی ممنوع") {
  return error(message, 403);
}

export function serverError(message = "خطای سرور") {
  return error(message, 500);
}
