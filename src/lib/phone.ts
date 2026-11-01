/** Normalize Iranian phone numbers to 11-digit format starting with 09 */
export function normalizePhone(raw: string): string | null {
  const digits = String(raw ?? "")
    .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/\D/g, "");
  if (/^09\d{9}$/.test(digits)) return digits;
  if (/^9\d{9}$/.test(digits)) return `0${digits}`;
  if (/^98\d{10}$/.test(digits)) return `0${digits.slice(2)}`;
  return null;
}
