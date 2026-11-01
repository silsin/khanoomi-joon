export async function POST(req: Request) {
  const { NextResponse } = await import("next/server");
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret") || "";
    const expected = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
    if (expected && secret !== expected) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    const update = await req.json().catch(() => ({}));
    const chatId = update?.message?.chat?.id;
    const text = update?.message?.text;
    if (chatId && text) {
      const { botHandleMessage } = await import("@/lib/telegram-bot");
      await botHandleMessage(Number(chatId), String(text));
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("telegram webhook", e);
    const { NextResponse } = await import("next/server");
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  const { NextResponse } = await import("next/server");
  return NextResponse.json({ ok: true, hint: "POST telegram updates here" });
}

export const dynamic = "force-dynamic";
