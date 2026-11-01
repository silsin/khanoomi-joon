import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { error, serverError } from "@/lib/response";
import { NextResponse } from "next/server";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
// In Docker, UPLOAD_DIR is set to /app/data/uploads (same persistent volume as DB)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const IMAGE_TYPES    = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES    = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if ("error" in auth) return error(auth.error, auth.status);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return error("فایلی ارسال نشده");
    const isVideo = VIDEO_TYPES.includes(file.type);
    if (!isVideo && !IMAGE_TYPES.includes(file.type)) return error("فرمت فایل مجاز نیست (JPG, PNG, WebP, GIF, MP4, WebM, MOV)");
    if (isVideo && file.size > MAX_VIDEO_SIZE) return error("حجم ویدیو بیش از ۵۰ مگابایت است");
    if (!isVideo && file.size > MAX_IMAGE_SIZE) return error("حجم فایل بیش از ۵ مگابایت است");

    // Create upload dir
    mkdirSync(UPLOAD_DIR, { recursive: true });

    // Unique filename
    const ext  = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, name);

    // Write to disk
    const buf = Buffer.from(await file.arrayBuffer());
    writeFileSync(filePath, buf);

    const publicUrl = `/api/uploads/${name}`;

    return NextResponse.json({ success: true, data: { url: publicUrl, name } });
  } catch (e) {
    console.error("Upload error:", e);
    return serverError();
  }
}

// Config to accept multipart
export const runtime = "nodejs";
