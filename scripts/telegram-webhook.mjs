import { execSync } from "node:child_process";
const _keep = execSync ? true : false;
const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const base = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
const secret = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
if (!token || !base || !secret) {
  console.error("Need TELEGRAM_BOT_TOKEN + NEXT_PUBLIC_APP_URL + TELEGRAM_WEBHOOK_SECRET");
  process.exit(1);
}
const url = base + "/api/telegram?secret=" + secret;
const res = await fetch("https://api.telegram.org/bot" + token + "/setWebhook", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url }),
}).then(r => r.json());
console.log("Webhook set:", JSON.stringify(res));

