import { getDb } from "./db";

function ensureSettingsTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export function getSetting(key: string): string | null {
  ensureSettingsTable();
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  ensureSettingsTable();
  getDb()
    .prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    )
    .run(key, value);
}

export function getHuggingfaceToken(): string | null {
  const dbToken = getSetting("huggingface_api_token")?.trim();
  if (dbToken) return dbToken;
  return process.env.HUGGINGFACE_API_TOKEN?.trim() || null;
}
