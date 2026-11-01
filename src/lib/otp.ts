import { createHmac, randomInt } from "node:crypto";

export const OTP_LENGTH = 5;
export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_SEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_SENDS_PER_HOUR = 5;

export function generateOtpCode(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

function otpSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required for OTP hashing");
  return secret;
}

export function hashOtpCode(code: string): string {
  return createHmac("sha256", otpSecret()).update(code).digest("hex");
}

export function verifyOtpCode(code: string, hash: string): boolean {
  const expected = hashOtpCode(code);
  if (expected.length !== hash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return mismatch === 0;
}

export function otpExpiresAt(): string {
  return new Date(Date.now() + OTP_TTL_MS).toISOString();
}
