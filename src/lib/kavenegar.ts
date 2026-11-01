const KAVENEGAR_API = "https://api.kavenegar.com/v1";

interface KavenegarResponse {
  return?: { status?: number; message?: string };
  entries?: unknown;
}

function getApiKey(): string | null {
  const key = process.env.KAVENEGAR_API_KEY?.trim();
  return key || null;
}

function requireApiKey(): string {
  const key = getApiKey();
  if (!key) throw new Error("KAVENEGAR_API_KEY is not configured");
  return key;
}

async function kavenegarRequest(
  path: string,
  params: Record<string, string>
): Promise<KavenegarResponse> {
  const apiKey = requireApiKey();
  const body = new URLSearchParams(params);
  const res = await fetch(`${KAVENEGAR_API}/${apiKey}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await res.json()) as KavenegarResponse;
  const status = data.return?.status;
  if (!res.ok || status !== 200) {
    const message = data.return?.message || `Kavenegar HTTP ${res.status}`;
    throw new Error(status ? `Kavenegar ${status}: ${message}` : message);
  }
  return data;
}

/**
 * Send OTP via Kavenegar verify/lookup (اعتبارسنجی) — preferred.
 * Use KAVENEGAR_OTP_PLAIN_SMS=1 to force plain sms/send instead.
 * @see https://kavenegar.com/rest.html#verify-lookup
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) {
    const devMode = process.env.NODE_ENV === "development" || process.env.OTP_DEV_LOG === "1";
    if (devMode) {
      console.log(`[OTP dev] KAVENEGAR_API_KEY missing — code for ${phone}: ${code}`);
      return;
    }
    throw new Error("KAVENEGAR_API_KEY is not configured");
  }

  const template = process.env.KAVENEGAR_OTP_TEMPLATE?.trim() || "verify";
  const siteName = process.env.KAVENEGAR_SITE_NAME?.trim() || "خانوم جون";
  const usePlainSms = process.env.KAVENEGAR_OTP_PLAIN_SMS === "1";

  // Preferred: verify/lookup — high priority, not filtered as promotional SMS
  if (!usePlainSms) {
    await kavenegarRequest("verify/lookup.json", {
      receptor: phone,
      token: code,
      template,
      type: "sms",
    });
    return;
  }

  // Fallback: plain sms/send (can be blocked if user disabled ads)
  const message = `کد ورود ${siteName}: ${code}\nاین کد تا ۵ دقیقه معتبر است.`;
  await sendPlainSms(phone, message);
}

/** Plain SMS via sms/send.json — for transactional notices (order status, etc.). */
export async function sendPlainSms(phone: string, message: string): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) {
    const devMode = process.env.NODE_ENV === "development" || process.env.OTP_DEV_LOG === "1";
    if (devMode) {
      console.log(`[SMS dev] KAVENEGAR_API_KEY missing — to ${phone}: ${message}`);
      return;
    }
    throw new Error("KAVENEGAR_API_KEY is not configured");
  }

  const sender = normalizeSender(process.env.KAVENEGAR_SENDER);
  const params: Record<string, string> = { receptor: phone, message };
  if (sender) params.sender = sender;
  await kavenegarRequest("sms/send.json", params);
}

/** Normalize sender line: +9810004347 → 10004347 */
function normalizeSender(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("98") && digits.length > 10) return digits.slice(2);
  return digits || value;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار بررسی",
  CONFIRMED: "تأیید شده",
  PROCESSING: "در حال آماده‌سازی",
  SHIPPED: "ارسال شده",
  DELIVERED: "تحویل داده شده",
  CANCELLED: "لغو شده",
};

/** Notify recipient that an order status changed. */
export async function sendOrderStatusSms(
  phone: string,
  orderId: string,
  status: string
): Promise<void> {
  const siteName = process.env.KAVENEGAR_SITE_NAME?.trim() || "خانوم جون";
  const label = ORDER_STATUS_LABELS[status] || status;
  const shortId = orderId.slice(0, 8);
  const message = `${siteName}\nسفارش ${shortId}\nوضعیت: ${label}`;
  await sendPlainSms(phone, message);
}
